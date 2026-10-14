<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\UserPlanItem;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

// Today v2: the caller's own day plan.
beforeEach(fn () => $this->travelTo(Carbon::parse('2026-10-14 10:00:00')));

afterEach(fn () => Workspace::forgetCurrent());

/** @return array{token:string, user:User, workspace:Workspace, issue:Closure(array):Issue} */
function planApiWorld(array $userAttrs = ['is_developer' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $team = Team::factory()->for($ws, 'workspace')->create();
    // Every column a signal reads is pinned: the factory's own values would add tags.
    $issue = fn (array $attrs = []): Issue => Issue::factory()->for($ws, 'workspace')->create(array_merge([
        'team_id' => $team->id, 'created_by' => $user->id, 'assignee_id' => $user->id, 'cycle_id' => null,
        'status' => 'todo', 'priority' => 'no_priority', 'estimate' => null, 'due_date' => null,
    ], $attrs));

    return ['token' => app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'], 'user' => $user, 'workspace' => $ws, 'issue' => $issue];
}

/** A plan item written straight to the table (the current workspace fills workspace_id). */
function planApiItem(User $user, Issue $issue, float $position, array $attrs = []): UserPlanItem
{
    return UserPlanItem::query()->create(array_merge(['user_id' => $user->id, 'issue_id' => $issue->id, 'position' => $position, 'minutes' => 60], $attrs));
}

/** GET /v1/me/plan for a local midnight (UTC midnight of the frozen day unless given). */
function planApiUrl(?string $dayStart = null): string
{
    return '/v1/me/plan?day_start='.urlencode($dayStart ?? now()->startOfDay()->toIso8601String());
}

/** @return list<string> */
function planApiTitles($res, string $list = 'items'): array
{
    return collect($res->json("data.{$list}"))->pluck('issue.title')->all();
}

it('lists only the caller\'s open plan items, in order, each with its tag and reason, and the capacity', function (): void {
    ['token' => $token, 'user' => $user, 'workspace' => $ws, 'issue' => $make] = planApiWorld();
    $other = User::factory()->for($ws, 'workspace')->create(['is_developer' => true]);
    $due = $make(['title' => 'Due today', 'due_date' => '2026-10-14']);
    $plain = $make(['title' => 'Plain']);
    planApiItem($user, $plain, 2);
    planApiItem($user, $due, 1);
    planApiItem($user, $make(['title' => 'Done yesterday', 'status' => 'done', 'completed_at' => now()->subDay()]), 3);
    planApiItem($user, $make(['title' => 'Cancelled', 'status' => 'cancelled']), 4);
    planApiItem($user, $make(['title' => 'Archived', 'archived_at' => now()]), 5);
    $deleted = $make(['title' => 'Deleted']);
    planApiItem($user, $deleted, 6);
    $deleted->delete();
    planApiItem($other, $make(['title' => 'Not mine']), 0);

    $res = $this->withToken($token)->getJson(planApiUrl())->assertStatus(200);

    expect(planApiTitles($res))->toBe(['Due today', 'Plain']);
    $res->assertJsonPath('data.capacity_minutes', 360)
        ->assertJsonPath('data.items.0.issue.identifier', Issue::referenceFor($due->id))
        ->assertJsonPath('data.items.0.minutes', 60)
        ->assertJsonPath('data.items.0.tag', ['label' => 'Due today', 'tone' => 'amber'])
        ->assertJsonPath('data.items.0.reason', "It's due today.")
        ->assertJsonPath('data.items.1.tag', null)
        ->assertJsonPath('data.items.1.reason', 'Assigned to you.')
        ->assertJsonPath('data.done_today', []);
});

it('lists what was completed since the caller\'s day started, newest first, with Undo only for what the plan completed', function (): void {
    ['token' => $token, 'user' => $user, 'issue' => $make] = planApiWorld();
    $start = now()->startOfDay();
    planApiItem($user, $make(['title' => 'Finished first', 'status' => 'done', 'completed_at' => $start->copy()->addHour()]), 1, ['previous_status' => 'in_progress']);
    planApiItem($user, $make(['title' => 'Finished later', 'status' => 'done', 'completed_at' => $start->copy()->addHours(2)]), 2);
    planApiItem($user, $make(['title' => 'Finished yesterday', 'status' => 'done', 'completed_at' => $start->copy()->subMinute()]), 3);

    $res = $this->withToken($token)->getJson(planApiUrl())->assertStatus(200);

    expect(planApiTitles($res, 'done_today'))->toBe(['Finished later', 'Finished first']);
    $res->assertJsonPath('data.done_today.0.can_undo', false)
        ->assertJsonPath('data.done_today.1.can_undo', true)
        ->assertJsonPath('data.items', []);
});

it('reads the day in the caller\'s own time zone, and asks for a day that has started and is not long gone', function (): void {
    ['token' => $token, 'user' => $user, 'issue' => $make] = planApiWorld();
    planApiItem($user, $make(['title' => 'Due on the 14th', 'due_date' => '2026-10-14']), 1);

    // 05:00 UTC on the 14th is local midnight in UTC-5: the 14th there, so due today.
    $this->withToken($token)->getJson(planApiUrl('2026-10-14T00:00:00-05:00'))
        ->assertStatus(200)->assertJsonPath('data.items.0.tag.label', 'Due today');
    // Local midnight of the 13th in UTC-5 (29 hours ago): due tomorrow.
    $this->withToken($token)->getJson(planApiUrl('2026-10-13T00:00:00-05:00'))
        ->assertStatus(200)->assertJsonPath('data.items.0.tag.label', 'Due tomorrow');

    $this->withToken($token)->getJson('/v1/me/plan')->assertStatus(422)->assertJsonValidationErrors('day_start');
    $this->withToken($token)->getJson(planApiUrl(now()->addHour()->toIso8601String()))->assertStatus(422);
    $this->withToken($token)->getJson(planApiUrl(now()->subHours(37)->toIso8601String()))->assertStatus(422);
});

it('adds an issue at the end of the plan (201), an hour a point unless told; adding it again changes nothing (200)', function (): void {
    ['token' => $token, 'user' => $user, 'issue' => $make] = planApiWorld();
    planApiItem($user, $make(['title' => 'Already planned']), 5);
    $three = $make(['title' => 'Three points', 'estimate' => 3]);
    $none = $make(['title' => 'No points']);

    $this->withToken($token)->postJson('/v1/me/plan', ['issue_id' => $three->id])
        ->assertStatus(201)
        ->assertJsonPath('data.issue.title', 'Three points')
        ->assertJsonPath('data.minutes', 180)
        ->assertJsonPath('data.tag', null)
        ->assertJsonPath('data.can_undo', false);
    $this->withToken($token)->postJson('/v1/me/plan', ['issue_id' => $none->id, 'minutes' => 45])
        ->assertStatus(201)->assertJsonPath('data.minutes', 45);
    $this->withToken($token)->postJson('/v1/me/plan', ['issue_id' => $three->id, 'minutes' => 30])
        ->assertStatus(200)->assertJsonPath('data.minutes', 180);

    expect(UserPlanItem::query()->where('issue_id', $three->id)->count())->toBe(1);
    $res = $this->withToken($token)->getJson(planApiUrl())->assertStatus(200);
    expect(planApiTitles($res))->toBe(['Already planned', 'Three points', 'No points']);
});

it('adds only a live, open, unarchived issue of the workspace, within the times allowed, up to 20 (422)', function (): void {
    ['issue' => $makeForeign] = planApiWorld();
    $foreign = $makeForeign(['title' => 'Elsewhere']);
    Workspace::forgetCurrent();
    ['token' => $token, 'user' => $user, 'workspace' => $ws, 'issue' => $make] = planApiWorld();
    $deleted = $make(['title' => 'Gone']);
    $deleted->delete();
    $open = $make(['title' => 'Open']);

    $this->withToken($token)->withSession(['ensure_valid_tenant_session_tenant_id' => $ws->id])
        ->postJson('/v1/me/plan', ['issue_id' => $foreign->id])->assertStatus(422)->assertJsonValidationErrors('issue_id');
    foreach ([$deleted, $make(['status' => 'done']), $make(['status' => 'cancelled']), $make(['archived_at' => now()])] as $closed) {
        $this->withToken($token)->postJson('/v1/me/plan', ['issue_id' => $closed->id])->assertStatus(422)->assertJsonValidationErrors('issue_id');
    }
    $this->withToken($token)->postJson('/v1/me/plan', ['issue_id' => $open->id, 'minutes' => 10])->assertStatus(422)->assertJsonValidationErrors('minutes');
    $this->withToken($token)->postJson('/v1/me/plan', ['issue_id' => $open->id, 'minutes' => 721])->assertStatus(422)->assertJsonValidationErrors('minutes');

    for ($i = 1; $i <= 20; $i++) {
        planApiItem($user, $make(['title' => "Planned {$i}"]), $i);
    }
    $this->withToken($token)->postJson('/v1/me/plan', ['issue_id' => $open->id])->assertStatus(422)->assertJsonValidationErrors('issue_id');
});

it('changes an item\'s time and place, renumbering when two crowd together', function (): void {
    ['token' => $token, 'user' => $user, 'issue' => $make] = planApiWorld();
    $first = $make(['title' => 'First']);
    $second = $make(['title' => 'Second']);
    planApiItem($user, $first, 1);
    planApiItem($user, $second, 2);

    $this->withToken($token)->patchJson("/v1/me/plan/{$second->id}", ['minutes' => 90])
        ->assertStatus(200)->assertJsonPath('data.minutes', 90);
    $this->withToken($token)->patchJson("/v1/me/plan/{$second->id}", ['position' => 0.5])->assertStatus(200);
    expect(planApiTitles($this->withToken($token)->getJson(planApiUrl())))->toBe(['Second', 'First']);

    $this->withToken($token)->patchJson("/v1/me/plan/{$first->id}", ['position' => 0.5 + 1e-9])->assertStatus(200);
    $positions = UserPlanItem::query()->where('user_id', $user->id)->orderBy('position')->pluck('position')->map(fn ($p) => (float) $p)->all();
    expect($positions)->toBe([1.0, 2.0]);
});

it('rejects an infinite position, a time out of range and an empty change (422), and changes nothing', function (): void {
    ['token' => $token, 'user' => $user, 'issue' => $make] = planApiWorld();
    $issue = $make(['title' => 'Keep me']);
    planApiItem($user, $issue, 1, ['minutes' => 60]);
    $url = "/v1/me/plan/{$issue->id}";

    // JSON's 1e999 decodes to INF: stored, it would break every later plan answer (json_encode refuses INF).
    $this->withToken($token)
        ->call('PATCH', $url, [], [], [], $this->transformHeadersToServerVars(['Content-Type' => 'application/json', 'Accept' => 'application/json']), '{"position":1e999}')
        ->assertStatus(422);
    $this->withToken($token)->patchJson($url, ['minutes' => 721])->assertStatus(422);
    $this->withToken($token)->patchJson($url, [])->assertStatus(422);

    expect(UserPlanItem::query()->where('issue_id', $issue->id)->first()?->minutes)->toBe(60);
});

it('takes an issue off the plan (204); an issue not on the caller\'s plan answers 404', function (): void {
    ['token' => $token, 'user' => $user, 'workspace' => $ws, 'issue' => $make] = planApiWorld();
    $mine = $make(['title' => 'Mine']);
    $theirs = $make(['title' => 'Theirs']);
    planApiItem($user, $mine, 1);
    $other = User::factory()->for($ws, 'workspace')->create(['is_developer' => true]);
    planApiItem($other, $theirs, 1);

    $this->withToken($token)->deleteJson("/v1/me/plan/{$mine->id}")->assertStatus(204);
    $this->withToken($token)->deleteJson("/v1/me/plan/{$mine->id}")->assertStatus(404);
    $this->withToken($token)->patchJson("/v1/me/plan/{$theirs->id}", ['minutes' => 30])->assertStatus(404);
    $this->withToken($token)->deleteJson("/v1/me/plan/{$theirs->id}")->assertStatus(404);

    expect(UserPlanItem::query()->where('user_id', $other->id)->count())->toBe(1);
});

it('sets the daily focus capacity in whole hours from 3 to 9', function (): void {
    ['token' => $token] = planApiWorld();

    $this->withToken($token)->putJson('/v1/me/plan/capacity', ['minutes' => 240])
        ->assertStatus(200)->assertJsonPath('data.capacity_minutes', 240);
    $this->withToken($token)->getJson(planApiUrl())->assertJsonPath('data.capacity_minutes', 240);

    foreach ([120, 600, 250] as $minutes) {
        $this->withToken($token)->putJson('/v1/me/plan/capacity', ['minutes' => $minutes])->assertStatus(422)->assertJsonValidationErrors('minutes');
    }
});

it('is for tracker users: a plain member gets 403', function (): void {
    ['token' => $token] = planApiWorld(['is_developer' => false, 'admin_level' => 'member']);

    $this->withToken($token)->getJson(planApiUrl())->assertStatus(403);
    $this->withToken($token)->putJson('/v1/me/plan/capacity', ['minutes' => 240])->assertStatus(403);
});

it('enforces RLS on user_plan_items', function (): void {
    $row = collect(DB::select("select relrowsecurity, relforcerowsecurity from pg_class where relname = 'user_plan_items'"))->first();
    expect($row->relrowsecurity)->toBeTrue();
    expect($row->relforcerowsecurity)->toBeTrue();

    ['user' => $user, 'issue' => $make] = planApiWorld();
    planApiItem($user, $make(['title' => 'Mine']), 1);
    Workspace::forgetCurrent();
    Workspace::factory()->create()->makeCurrent();

    // RLS bites even a raw query under the other tenant's GUC.
    expect(DB::table('user_plan_items')->count())->toBe(0);
});

it('starts done today at the caller\'s own midnight, whatever its offset', function (): void {
    ['token' => $token, 'user' => $user, 'issue' => $make] = planApiWorld();
    planApiItem($user, $make(['title' => 'Late on the 13th, UTC', 'status' => 'done', 'completed_at' => '2026-10-13 23:00:00']), 1);
    planApiItem($user, $make(['title' => 'Earlier on the 13th, UTC', 'status' => 'done', 'completed_at' => '2026-10-13 21:00:00']), 2);
    planApiItem($user, $make(['title' => 'Early on the 14th, UTC', 'status' => 'done', 'completed_at' => '2026-10-14 03:00:00']), 3);

    // Midnight in UTC+2 is 22:00 UTC on the 13th: the 23:00 and 03:00 completions are today there, the 21:00 one is not.
    $east = $this->withToken($token)->getJson(planApiUrl('2026-10-14T00:00:00+02:00'))->assertStatus(200);
    expect(planApiTitles($east, 'done_today'))->toBe(['Early on the 14th, UTC', 'Late on the 13th, UTC']);

    // Midnight in UTC-5 is 05:00 UTC on the 14th: all three came the day before there.
    $west = $this->withToken($token)->getJson(planApiUrl('2026-10-14T00:00:00-05:00'))->assertStatus(200);
    expect(planApiTitles($west, 'done_today'))->toBe([]);
});
