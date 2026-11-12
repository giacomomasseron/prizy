<?php

declare(strict_types=1);

use App\Events\IssueCreated;
use App\Events\IssueStatusChanged;
use App\Events\IssueUnblocked;
use App\Events\NotificationCreated;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

beforeEach(fn () => Event::fake([
    IssueCreated::class,
    IssueStatusChanged::class,
    IssueUnblocked::class,
    NotificationCreated::class,
]));

/** @return array{0:string,1:User,2:Workspace,3:Team} */
function positionWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $token = app(CreatePersonalAccessToken::class)->run($user, 't', null)['token'];

    return [$token, $user, $ws, $team];
}

/** An issue at a known place in the manual order. The value is written as SQL text, so no digit is lost on the way in. */
function positionIssue(Workspace $ws, Team $team, User $user, string $status, string $sortOrder = '0'): Issue
{
    $issue = Issue::factory()->for($ws, 'workspace')->create([
        'team_id' => $team->id,
        'created_by' => $user->id,
        'status' => $status,
        'updated_at' => now()->subDay(),
    ]);
    DB::update("UPDATE issues SET sort_order = {$sortOrder}::double precision WHERE id = ?", [$issue->id]);

    return $issue;
}

/** @return list<string> the ids of a status's issues, in the order the list and the board show them */
function positionOrder(string $token, string $status): array
{
    return test()->withToken($token)->getJson("/v1/issues?filter[status]={$status}")->assertOk()->json('data.*.id');
}

it('places an issue before another one in its column, without logging or restamping it', function (): void {
    [$token, $user, $ws, $team] = positionWorld();
    $a = positionIssue($ws, $team, $user, 'todo', '1024');
    $b = positionIssue($ws, $team, $user, 'todo', '2048');
    $c = positionIssue($ws, $team, $user, 'todo', '3072');
    $stamp = DB::table('issues')->where('id', $c->id)->value('updated_at');

    $this->withToken($token)->putJson("/v1/issues/{$c->id}/position", ['before_id' => $b->id])
        ->assertOk()->assertJson(['data' => ['id' => $c->id, 'status' => 'todo']]);

    expect(positionOrder($token, 'todo'))->toBe([$a->id, $c->id, $b->id]);
    expect(DB::table('issues')->where('id', $c->id)->value('updated_at'))->toBe($stamp);
    $this->assertDatabaseMissing('issue_activities', ['issue_id' => $c->id]);
    Event::assertNotDispatched(IssueStatusChanged::class);

    Workspace::forgetCurrent();
});

it('places an issue before the first one of its column', function (): void {
    [$token, $user, $ws, $team] = positionWorld();
    $a = positionIssue($ws, $team, $user, 'todo', '1024');
    $b = positionIssue($ws, $team, $user, 'todo', '2048');
    $c = positionIssue($ws, $team, $user, 'todo', '3072');

    $this->withToken($token)->putJson("/v1/issues/{$c->id}/position", ['before_id' => $a->id])->assertOk();

    expect(positionOrder($token, 'todo'))->toBe([$c->id, $a->id, $b->id]);

    Workspace::forgetCurrent();
});

it('reorders a column whose issues all still hold the default order value, keeping every other order as it was', function (): void {
    [$token, $user, $ws, $team] = positionWorld();
    foreach (range(1, 4) as $i) {
        positionIssue($ws, $team, $user, 'todo');
    }
    foreach (range(1, 3) as $i) {
        positionIssue($ws, $team, $user, 'backlog');
    }
    [$w, $x, $y, $z] = positionOrder($token, 'todo');
    $backlog = positionOrder($token, 'backlog');

    $this->withToken($token)->putJson("/v1/issues/{$z}/position", ['before_id' => $x])->assertOk();

    expect(positionOrder($token, 'todo'))->toBe([$w, $z, $x, $y]);
    expect(positionOrder($token, 'backlog'))->toBe($backlog);

    // And again, now that the values are spread out.
    $this->withToken($token)->putJson("/v1/issues/{$y}/position", ['before_id' => $w])->assertOk();

    expect(positionOrder($token, 'todo'))->toBe([$y, $w, $z, $x]);

    Workspace::forgetCurrent();
});

it('still finds a place between two neighbours whose order values are one step apart', function (): void {
    [$token, $user, $ws, $team] = positionWorld();
    $a = positionIssue($ws, $team, $user, 'todo', '1');
    $b = positionIssue($ws, $team, $user, 'todo', '1.0000000000000002'); // the next double after 1
    $c = positionIssue($ws, $team, $user, 'todo', '5');
    expect(positionOrder($token, 'todo'))->toBe([$a->id, $b->id, $c->id]);

    $this->withToken($token)->putJson("/v1/issues/{$c->id}/position", ['before_id' => $b->id])->assertOk();

    expect(positionOrder($token, 'todo'))->toBe([$a->id, $c->id, $b->id]);

    Workspace::forgetCurrent();
});

it('keeps bisecting the same gap for many moves in a row', function (): void {
    [$token, $user, $ws, $team] = positionWorld();
    $a = positionIssue($ws, $team, $user, 'todo', '1024');
    $b = positionIssue($ws, $team, $user, 'todo', '2048');
    $c = positionIssue($ws, $team, $user, 'todo', '3072');
    $d = positionIssue($ws, $team, $user, 'todo', '4096');

    // c and d take turns going right before b: each move halves the gap after a, past what a double can split.
    foreach (range(1, 70) as $i) {
        $moved = $i % 2 === 1 ? $c : $d;
        $this->withToken($token)->putJson("/v1/issues/{$moved->id}/position", ['before_id' => $b->id])->assertOk();
    }

    expect(positionOrder($token, 'todo'))->toBe([$a->id, $c->id, $d->id, $b->id]);

    Workspace::forgetCurrent();
});

it('moves an issue into another column, before one of its cards, as a status change', function (): void {
    [$token, $user, $ws, $team] = positionWorld();
    $x = positionIssue($ws, $team, $user, 'todo', '1024');
    $p = positionIssue($ws, $team, $user, 'in_progress', '2048');
    $q = positionIssue($ws, $team, $user, 'in_progress', '3072');

    $this->withToken($token)->putJson("/v1/issues/{$x->id}/position", ['status' => 'in_progress', 'before_id' => $q->id])
        ->assertOk()->assertJson(['data' => ['id' => $x->id, 'status' => 'in_progress']]);

    expect(positionOrder($token, 'in_progress'))->toBe([$p->id, $x->id, $q->id]);
    expect(positionOrder($token, 'todo'))->toBe([]);
    $this->assertDatabaseHas('issue_activities', ['issue_id' => $x->id, 'type' => 'status_changed', 'from_value' => 'todo', 'to_value' => 'in_progress']);
    Event::assertDispatched(IssueStatusChanged::class, fn (IssueStatusChanged $e): bool => $e->to === 'in_progress');

    Workspace::forgetCurrent();
});

it('drops an issue at the end of another column', function (): void {
    [$token, $user, $ws, $team] = positionWorld();
    $x = positionIssue($ws, $team, $user, 'todo', '1024');
    $p = positionIssue($ws, $team, $user, 'in_progress', '2048');
    $q = positionIssue($ws, $team, $user, 'in_progress', '3072');

    $this->withToken($token)->putJson("/v1/issues/{$x->id}/position", ['status' => 'in_progress', 'before_id' => null])
        ->assertOk()->assertJson(['data' => ['status' => 'in_progress']]);

    expect(positionOrder($token, 'in_progress'))->toBe([$p->id, $q->id, $x->id]);

    Workspace::forgetCurrent();
});

it('drops an issue into an empty column', function (): void {
    [$token, $user, $ws, $team] = positionWorld();
    $x = positionIssue($ws, $team, $user, 'todo', '1024');

    $this->withToken($token)->putJson("/v1/issues/{$x->id}/position", ['status' => 'done', 'before_id' => null])
        ->assertOk()->assertJson(['data' => ['status' => 'done']]);

    expect(positionOrder($token, 'done'))->toBe([$x->id]);

    Workspace::forgetCurrent();
});

it('moves an issue to the end of its own column', function (): void {
    [$token, $user, $ws, $team] = positionWorld();
    $a = positionIssue($ws, $team, $user, 'todo', '1024');
    $b = positionIssue($ws, $team, $user, 'todo', '2048');
    $c = positionIssue($ws, $team, $user, 'todo', '3072');

    $this->withToken($token)->putJson("/v1/issues/{$a->id}/position", ['before_id' => null])
        ->assertOk()->assertJson(['data' => ['status' => 'todo']]);

    expect(positionOrder($token, 'todo'))->toBe([$b->id, $c->id, $a->id]);
    $this->assertDatabaseMissing('issue_activities', ['issue_id' => $a->id]);

    Workspace::forgetCurrent();
});

it('rejects a place that makes no sense with 422, and moves nothing', function (array $body): void {
    [$token, $user, $ws, $team] = positionWorld();
    $a = positionIssue($ws, $team, $user, 'todo', '1024');
    $b = positionIssue($ws, $team, $user, 'todo', '2048');
    $other = positionIssue($ws, $team, $user, 'in_progress', '3072');
    $body = array_map(fn ($v) => match ($v) {
        ':self' => $b->id,
        ':other-column' => $other->id,
        default => $v,
    }, $body);

    $this->withToken($token)->putJson("/v1/issues/{$b->id}/position", $body)->assertStatus(422);

    expect(positionOrder($token, 'todo'))->toBe([$a->id, $b->id]);
    $this->assertDatabaseHas('issues', ['id' => $b->id, 'status' => 'todo']);

    Workspace::forgetCurrent();
})->with([
    'before itself' => [['before_id' => ':self']],
    'before an issue that does not exist' => [['before_id' => '00000000-0000-4000-8000-000000000000']],
    'before an issue of another column' => [['before_id' => ':other-column']],
    'before an issue that is not in the column it is moved to' => [['status' => 'done', 'before_id' => ':other-column']],
    'a status that does not exist' => [['status' => 'flying', 'before_id' => null]],
    'no before_id at all' => [['status' => 'in_progress']],
    'a before_id that is not an id' => [['before_id' => 'first']],
]);

it('rejects a place before another workspace\'s issue with 422', function (): void {
    $foreignWs = Workspace::factory()->create();
    $this->actingInWorkspace($foreignWs);
    $foreignUser = User::factory()->for($foreignWs, 'workspace')->create();
    $foreignTeam = Team::factory()->for($foreignWs, 'workspace')->create();
    $foreign = positionIssue($foreignWs, $foreignTeam, $foreignUser, 'todo', '1024');
    Workspace::forgetCurrent();
    $this->flushSession();

    [$token, $user, $ws, $team] = positionWorld();
    $mine = positionIssue($ws, $team, $user, 'todo', '2048');

    $this->withToken($token)->putJson("/v1/issues/{$mine->id}/position", ['before_id' => $foreign->id])->assertStatus(422);

    Workspace::forgetCurrent();
});

it('does not let a viewer move an issue', function (): void {
    [, $user, $ws, $team] = positionWorld();
    $a = positionIssue($ws, $team, $user, 'todo', '1024');
    $b = positionIssue($ws, $team, $user, 'todo', '2048');
    $viewer = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true, 'admin_level' => 'viewer']);
    $viewerToken = app(CreatePersonalAccessToken::class)->run($viewer, 't', null)['token'];

    $this->withToken($viewerToken)->putJson("/v1/issues/{$b->id}/position", ['before_id' => $a->id])->assertForbidden();

    expect(positionOrder($viewerToken, 'todo'))->toBe([$a->id, $b->id]);

    Workspace::forgetCurrent();
});

it('puts a new issue last in the manual order', function (): void {
    [$token, $user, $ws, $team] = positionWorld();
    $a = positionIssue($ws, $team, $user, 'backlog', '1024');
    $b = positionIssue($ws, $team, $user, 'backlog', '9000.5');
    positionIssue($ws, $team, $user, 'done', '20000');

    $id = $this->withToken($token)->postJson('/v1/issues', ['team_id' => $team->id, 'title' => 'Newest'])
        ->assertCreated()->json('data.id');

    expect(positionOrder($token, 'backlog'))->toBe([$a->id, $b->id, $id]);
    expect((float) DB::table('issues')->where('id', $id)->value('sort_order'))->toBeGreaterThan(20000.0);

    Workspace::forgetCurrent();
});
