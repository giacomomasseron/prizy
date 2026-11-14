<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Notification;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} */
function notifWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->run($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function makeNotif(Workspace $ws, User $user, array $attrs = []): Notification
{
    return Notification::create(array_merge([
        'id' => (string) Str::uuid(), 'user_id' => $user->id,
        'type' => 'issue_assigned', 'subject_type' => 'issue', 'subject_id' => (string) Str::uuid(),
    ], $attrs));
}

it('lists only the current user notifications and filters unread', function (): void {
    [$token, $ws, $user] = notifWorld();
    $unread = makeNotif($ws, $user);
    makeNotif($ws, $user, ['read_at' => now()]);
    // A second user's notification in the SAME workspace must not appear.
    $other = User::factory()->for($ws, 'workspace')->create();
    makeNotif($ws, $other);

    $all = $this->withToken($token)->getJson('/v1/notifications');
    $all->assertStatus(200)->assertJsonCount(2, 'data');

    $this->withToken($token)->getJson('/v1/notifications?filter[unread]=true')
        ->assertStatus(200)->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $unread->id);

    Workspace::forgetCurrent();
});

it('reports the unread count and clears it on mark-read / read-all', function (): void {
    [$token, $ws, $user] = notifWorld();
    $a = makeNotif($ws, $user);
    $b = makeNotif($ws, $user);

    $this->withToken($token)->getJson('/v1/notifications/unread-count')
        ->assertStatus(200)->assertJsonPath('data.count', 2);

    $this->withToken($token)->postJson("/v1/notifications/{$a->id}/read")
        ->assertStatus(200)->assertJsonPath('data.read_at', fn ($v) => $v !== null);
    $this->withToken($token)->getJson('/v1/notifications/unread-count')->assertJsonPath('data.count', 1);

    $this->withToken($token)->postJson('/v1/notifications/read-all')->assertStatus(204);
    $this->withToken($token)->getJson('/v1/notifications/unread-count')->assertJsonPath('data.count', 0);

    Workspace::forgetCurrent();
});

it('says how urgent the issue a notification is about is', function (): void {
    [$token, $ws, $user] = notifWorld();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['title' => 'Checkout is down', 'created_by' => $user->id, 'priority' => 'urgent']);
    makeNotif($ws, $user, ['subject_id' => $issue->id]);

    $this->withToken($token)->getJson('/v1/notifications')
        ->assertStatus(200)
        ->assertJsonPath('data.0.subject.title', 'Checkout is down')
        ->assertJsonPath('data.0.subject.priority', 'urgent');

    Workspace::forgetCurrent();
});

it('counts what each Inbox filter holds: unread ones, and everything snoozed or archived', function (): void {
    [$token, $ws, $user] = notifWorld();
    makeNotif($ws, $user);                                                        // assigned, unread
    makeNotif($ws, $user, ['read_at' => now()]);                                  // assigned, read: not counted
    makeNotif($ws, $user, ['type' => 'issue_mentioned']);                         // mention, unread
    makeNotif($ws, $user, ['type' => 'project_mentioned']);                       // mention, unread
    makeNotif($ws, $user, ['type' => 'issue_commented']);                         // only in All
    makeNotif($ws, $user, ['type' => 'issue_mentioned', 'snoozed_until' => now()->addDay()]);                  // snoozed: out of the reading lists
    makeNotif($ws, $user, ['read_at' => now(), 'snoozed_until' => now()->addDay()]);                           // snoozed and read: still in Snoozed
    makeNotif($ws, $user, ['type' => 'issue_mentioned', 'snoozed_until' => now()->subHour()]);                 // a snooze that ran out: back in the lists
    makeNotif($ws, $user, ['archived_at' => now()]);                              // archived
    makeNotif($ws, $user, ['archived_at' => now(), 'snoozed_until' => now()->addDay()]);                       // archived wins over snoozed
    // Someone else's, in the same workspace: never counted.
    $other = User::factory()->for($ws, 'workspace')->create();
    makeNotif($ws, $other, ['type' => 'issue_mentioned']);
    makeNotif($ws, $other, ['archived_at' => now()]);

    $this->withToken($token)->getJson('/v1/notifications/counts')
        ->assertStatus(200)
        ->assertExactJson(['data' => ['all' => 5, 'mention' => 3, 'assign' => 1, 'support' => 0, 'snoozed' => 2, 'archived' => 2]]);

    // The All number is the bell's number.
    $this->withToken($token)->getJson('/v1/notifications/unread-count')->assertJsonPath('data.count', 5);

    Workspace::forgetCurrent();
});

it('counts nothing for someone with no notifications', function (): void {
    [$token] = notifWorld();

    $this->withToken($token)->getJson('/v1/notifications/counts')
        ->assertStatus(200)
        ->assertExactJson(['data' => ['all' => 0, 'mention' => 0, 'assign' => 0, 'support' => 0, 'snoozed' => 0, 'archived' => 0]]);

    Workspace::forgetCurrent();
});

it('404s when marking another user notification read', function (): void {
    [$token, $ws, $user] = notifWorld();
    $other = User::factory()->for($ws, 'workspace')->create();
    $foreign = makeNotif($ws, $other);

    $this->withToken($token)->postJson("/v1/notifications/{$foreign->id}/read")->assertStatus(404);

    Workspace::forgetCurrent();
});

it('enriches the index payload with actor, body and a resolved issue subject', function (): void {
    [$token, $ws, $user] = notifWorld();
    $actor = User::factory()->for($ws, 'workspace')->create(['name' => 'Ada Actor']);
    $issue = Issue::factory()->for($ws, 'workspace')->create(['title' => 'Fix the login bug', 'created_by' => $user->id]);

    $notif = makeNotif($ws, $user, [
        'actor_id' => $actor->id,
        'body' => 'assigned you to an issue',
        'subject_type' => 'issue',
        'subject_id' => $issue->id,
    ]);

    $this->withToken($token)->getJson('/v1/notifications')
        ->assertStatus(200)
        ->assertJsonPath('data.0.id', $notif->id)
        ->assertJsonPath('data.0.body', 'assigned you to an issue')
        ->assertJsonPath('data.0.actor', ['id' => $actor->id, 'name' => 'Ada Actor'])
        ->assertJsonPath('data.0.subject', [
            'type' => 'issue',
            'id' => $issue->id,
            // The issue's reference (PRD §3.2.1): PRZ- and the uppercased id prefix.
            'ref' => 'PRZ-'.strtoupper(substr($issue->id, 0, 6)),
            'title' => 'Fix the login bug',
            'path' => "/issues/{$issue->id}",
            // The issue's own priority (the Inbox tags an urgent one); this issue was given none.
            'priority' => 'no_priority',
        ]);

    Workspace::forgetCurrent();
});

it('nulls actor and subject when the actor is absent or the subject is unresolvable', function (): void {
    [$token, $ws, $user] = notifWorld();

    // No actor, no body, and an issue id that does not exist.
    $orphan = makeNotif($ws, $user, ['subject_id' => (string) Str::uuid()]);
    // A subject_type the resource does not resolve at all.
    $other = makeNotif($ws, $user, ['subject_type' => 'ticket', 'subject_id' => (string) Str::uuid()]);

    $response = $this->withToken($token)->getJson('/v1/notifications')->assertStatus(200);

    $byId = collect($response->json('data'))->keyBy('id');
    expect($byId[$orphan->id]['actor'])->toBeNull();
    expect($byId[$orphan->id]['body'])->toBeNull();
    expect($byId[$orphan->id]['subject'])->toBeNull();
    expect($byId[$other->id]['subject'])->toBeNull();

    Workspace::forgetCurrent();
});

it('includes snoozed_until and archived_at in the index payload, null by default', function (): void {
    [$token, $ws, $user] = notifWorld();
    $notif = makeNotif($ws, $user);

    $this->withToken($token)->getJson('/v1/notifications')
        ->assertStatus(200)
        ->assertJsonPath('data.0.id', $notif->id)
        ->assertJsonPath('data.0.snoozed_until', null)
        ->assertJsonPath('data.0.archived_at', null);

    Workspace::forgetCurrent();
});

it('serializes snoozed_until and archived_at as ISO strings when set', function (): void {
    [$token, $ws, $user] = notifWorld();
    $notif = makeNotif($ws, $user, ['snoozed_until' => now()->addDay(), 'archived_at' => now()]);
    $fresh = $notif->fresh();

    // Archived + actively-snoozed is invisible under the default "all" category (Task 3
    // visibility rules) — fetch it via filter[category]=archived to check serialization.
    $this->withToken($token)->getJson('/v1/notifications?filter[category]=archived')
        ->assertStatus(200)
        ->assertJsonPath('data.0.snoozed_until', $fresh->snoozed_until->toISOString())
        ->assertJsonPath('data.0.archived_at', $fresh->archived_at->toISOString());

    Workspace::forgetCurrent();
});

it('filters by category: mention and assign each return only their type, excluding archived/snoozed', function (): void {
    [$token, $ws, $user] = notifWorld();
    $mention = makeNotif($ws, $user, ['type' => 'issue_mentioned']);
    $assign = makeNotif($ws, $user, ['type' => 'issue_assigned']);
    // Same types, but archived or actively snoozed — must not leak into either category.
    makeNotif($ws, $user, ['type' => 'issue_mentioned', 'archived_at' => now()]);
    makeNotif($ws, $user, ['type' => 'issue_assigned', 'snoozed_until' => now()->addDay()]);

    $this->withToken($token)->getJson('/v1/notifications?filter[category]=mention')
        ->assertStatus(200)->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $mention->id);

    $this->withToken($token)->getJson('/v1/notifications?filter[category]=assign')
        ->assertStatus(200)->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $assign->id);

    Workspace::forgetCurrent();
});

it('filters by category: snoozed returns only future-snoozed (not archived) and archived returns only archived', function (): void {
    [$token, $ws, $user] = notifWorld();
    $snoozed = makeNotif($ws, $user, ['snoozed_until' => now()->addDay()]);
    $archived = makeNotif($ws, $user, ['archived_at' => now()]);
    // Past-snoozed (expired) must not count as "snoozed".
    makeNotif($ws, $user, ['snoozed_until' => now()->subHour()]);
    // Archived AND snoozed — belongs to archived, not snoozed.
    makeNotif($ws, $user, ['snoozed_until' => now()->addDay(), 'archived_at' => now()]);

    $this->withToken($token)->getJson('/v1/notifications?filter[category]=snoozed')
        ->assertStatus(200)->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $snoozed->id);

    $this->withToken($token)->getJson('/v1/notifications?filter[category]=archived')
        ->assertStatus(200)->assertJsonCount(2, 'data');
    $archivedIds = collect($this->withToken($token)->getJson('/v1/notifications?filter[category]=archived')->json('data'))->pluck('id');
    expect($archivedIds)->toContain($archived->id);

    Workspace::forgetCurrent();
});

it('defaults filter[category] to all, excluding archived and actively-snoozed notifications', function (): void {
    [$token, $ws, $user] = notifWorld();
    $visible = makeNotif($ws, $user);
    makeNotif($ws, $user, ['archived_at' => now()]);
    makeNotif($ws, $user, ['snoozed_until' => now()->addDay()]);
    // Expired snooze is visible again under "all".
    $expiredSnooze = makeNotif($ws, $user, ['snoozed_until' => now()->subHour()]);

    $response = $this->withToken($token)->getJson('/v1/notifications')->assertStatus(200)->assertJsonCount(2, 'data');
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($visible->id, $expiredSnooze->id);

    $this->withToken($token)->getJson('/v1/notifications?filter[category]=all')
        ->assertStatus(200)->assertJsonCount(2, 'data');

    Workspace::forgetCurrent();
});

it('combines filter[category]=archived with filter[unread]=true', function (): void {
    [$token, $ws, $user] = notifWorld();
    $archivedUnread = makeNotif($ws, $user, ['archived_at' => now()]);
    makeNotif($ws, $user, ['archived_at' => now(), 'read_at' => now()]);

    $this->withToken($token)->getJson('/v1/notifications?filter[category]=archived&filter[unread]=true')
        ->assertStatus(200)->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $archivedUnread->id);

    Workspace::forgetCurrent();
});

it('rejects an invalid filter[category] with 422', function (): void {
    [$token, $ws, $user] = notifWorld();

    $this->withToken($token)->getJson('/v1/notifications?filter[category]=bogus')
        ->assertStatus(422);

    Workspace::forgetCurrent();
});

it('preserves filter[category] across the cursor next link and returns the correct next page', function (): void {
    [$token, $ws, $user] = notifWorld();
    // 3 mentions (limit=2 forces a next page); interleave an assign to prove no leakage.
    // Distinct, whole-second created_at values (no fractional seconds) — cursor pagination
    // round-trips the cursor value through a (string) cast that truncates sub-second
    // precision, so rows sharing a DB-default now() (frozen per-transaction under
    // RefreshDatabase) would otherwise collide and vanish from the next page.
    $base = Carbon::parse('2026-08-08 08:00:00', 'UTC');
    $mentions = collect(range(1, 3))->map(fn (int $i) => makeNotif($ws, $user, ['type' => 'issue_mentioned', 'created_at' => $base->copy()->addMinutes($i)]));
    makeNotif($ws, $user, ['type' => 'issue_assigned', 'created_at' => $base->copy()->addMinutes(4)]);

    $first = $this->withToken($token)->getJson('/v1/notifications?filter[category]=mention&limit=2')
        ->assertStatus(200)->assertJsonCount(2, 'data');

    $nextUrl = $first->json('links.next');
    expect($nextUrl)->not->toBeNull();
    parse_str((string) parse_url($nextUrl, PHP_URL_QUERY), $nextParams);
    expect($nextParams['filter']['category'] ?? null)->toBe('mention');

    $path = (string) parse_url($nextUrl, PHP_URL_PATH);
    $query = (string) parse_url($nextUrl, PHP_URL_QUERY);
    $second = $this->withToken($token)->getJson($path.'?'.$query)->assertStatus(200);
    $secondIds = collect($second->json('data'))->pluck('id');
    expect($secondIds)->toHaveCount(1);
    // Only mention-type rows across both pages; no assign row leaked in.
    $firstIds = collect($first->json('data'))->pluck('id');
    $allSeenIds = $firstIds->merge($secondIds);
    expect($allSeenIds->sort()->values()->all())->toEqual($mentions->pluck('id')->sort()->values()->all());

    Workspace::forgetCurrent();
});

it('POST /{id}/snooze snoozes and it appears under snoozed but not under all', function (): void {
    [$token, $ws, $user] = notifWorld();
    $notif = makeNotif($ws, $user);

    $this->withToken($token)->postJson("/v1/notifications/{$notif->id}/snooze")
        ->assertStatus(200)->assertJsonPath('data.snoozed_until', fn ($v) => $v !== null);

    $this->withToken($token)->getJson('/v1/notifications?filter[category]=snoozed')
        ->assertStatus(200)->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $notif->id);

    $this->withToken($token)->getJson('/v1/notifications?filter[category]=all')
        ->assertStatus(200)->assertJsonCount(0, 'data');

    Workspace::forgetCurrent();
});

it('POST /{id}/archive archives and it appears under archived but not under all', function (): void {
    [$token, $ws, $user] = notifWorld();
    $notif = makeNotif($ws, $user);

    $this->withToken($token)->postJson("/v1/notifications/{$notif->id}/archive")
        ->assertStatus(200)->assertJsonPath('data.archived_at', fn ($v) => $v !== null);

    $this->withToken($token)->getJson('/v1/notifications?filter[category]=archived')
        ->assertStatus(200)->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $notif->id);

    $this->withToken($token)->getJson('/v1/notifications?filter[category]=all')
        ->assertStatus(200)->assertJsonCount(0, 'data');

    Workspace::forgetCurrent();
});

it('POST /{id}/unread clears read_at', function (): void {
    [$token, $ws, $user] = notifWorld();
    $notif = makeNotif($ws, $user, ['read_at' => now()]);

    $this->withToken($token)->postJson("/v1/notifications/{$notif->id}/unread")
        ->assertStatus(200)->assertJsonPath('data.read_at', null);

    Workspace::forgetCurrent();
});

it('404s when unread/snooze/archive target another user notification', function (): void {
    [$token, $ws, $user] = notifWorld();
    $other = User::factory()->for($ws, 'workspace')->create();
    $foreign = makeNotif($ws, $other);

    $this->withToken($token)->postJson("/v1/notifications/{$foreign->id}/unread")->assertStatus(404);
    $this->withToken($token)->postJson("/v1/notifications/{$foreign->id}/snooze")->assertStatus(404);
    $this->withToken($token)->postJson("/v1/notifications/{$foreign->id}/archive")->assertStatus(404);

    Workspace::forgetCurrent();
});

it('resolves issue subjects for a page of notifications with a single batch query (no N+1)', function (): void {
    [$token, $ws, $user] = notifWorld();
    $issues = Issue::factory()->for($ws, 'workspace')->count(4)->create(['created_by' => $user->id]);
    foreach ($issues as $issue) {
        makeNotif($ws, $user, ['subject_id' => $issue->id]);
    }
    // Plus one pointing at a missing issue, to prove it doesn't add a query of its own.
    makeNotif($ws, $user, ['subject_id' => (string) Str::uuid()]);

    DB::enableQueryLog();
    $this->withToken($token)->getJson('/v1/notifications')->assertStatus(200)->assertJsonCount(5, 'data');
    $issuesQueries = collect(DB::getQueryLog())->filter(fn (array $q): bool => str_contains($q['query'], 'from "issues"'));
    DB::disableQueryLog();

    expect($issuesQueries)->toHaveCount(1);

    Workspace::forgetCurrent();
});
