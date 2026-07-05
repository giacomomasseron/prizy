<?php
declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:User,2:Workspace,3:Team} */
function searchWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'admin_level' => 'owner', 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $token = app(CreatePersonalAccessToken::class)->handle($actor, 't', null)['token'];
    return [$token, $actor, $ws, $team];
}

function makeIssue(Workspace $ws, Team $team, User $creator, array $attrs = []): Issue
{
    return Issue::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'team_id' => $team->id,
        'created_by' => $creator->id, 'title' => 'Issue', 'status' => 'todo', 'priority' => 'no_priority',
    ], $attrs));
}

it('defaults new issues to source=native', function (): void {
    [$token, $actor, $ws, $team] = searchWorld();
    $issue = makeIssue($ws, $team, $actor, ['title' => 'Native one']);
    expect($issue->fresh()->source)->toBe('native');
    Workspace::forgetCurrent();
});

it('browses all workspace issues with an empty query, filtered by priority', function (): void {
    [$token, $actor, $ws, $team] = searchWorld();
    makeIssue($ws, $team, $actor, ['title' => 'Urgent A', 'priority' => 'urgent']);
    makeIssue($ws, $team, $actor, ['title' => 'Low B', 'priority' => 'low']);

    $res = $this->withToken($token)->getJson('/v1/search/issues?filter[priority]=urgent&sort=updated')->assertStatus(200);
    $titles = collect($res->json('data'))->pluck('title');
    expect($titles)->toContain('Urgent A');
    expect($titles)->not->toContain('Low B');
    Workspace::forgetCurrent();
});

it('filters by assignee, project, and source', function (): void {
    [$token, $actor, $ws, $team] = searchWorld();
    $assignee = User::factory()->for($ws, 'workspace')->create();
    makeIssue($ws, $team, $actor, ['title' => 'Mine', 'assignee_id' => $assignee->id]);
    makeIssue($ws, $team, $actor, ['title' => 'Unassigned']);

    $byAssignee = $this->withToken($token)->getJson("/v1/search/issues?filter[assignee_id]={$assignee->id}")->assertStatus(200);
    expect(collect($byAssignee->json('data'))->pluck('title'))->toContain('Mine')->not->toContain('Unassigned');

    // source stub: everything is native today
    $native = $this->withToken($token)->getJson('/v1/search/issues?filter[source]=native')->assertStatus(200);
    expect(count($native->json('data')))->toBeGreaterThan(0);
    $support = $this->withToken($token)->getJson('/v1/search/issues?filter[source]=support')->assertStatus(200);
    expect($support->json('data'))->toBe([]);
    Workspace::forgetCurrent();
});

it('filters by label via the many-to-many relation', function (): void {
    [$token, $actor, $ws, $team] = searchWorld();
    $labelId = (string) Str::uuid();
    \DB::table('labels')->insert(['id' => $labelId, 'workspace_id' => $ws->id, 'name' => 'Bug', 'color' => '#eb5757', 'created_at' => now(), 'updated_at' => now()]);
    $tagged = makeIssue($ws, $team, $actor, ['title' => 'Tagged']);
    makeIssue($ws, $team, $actor, ['title' => 'Untagged']);
    \DB::table('issue_labels')->insert(['issue_id' => $tagged->id, 'label_id' => $labelId]);

    $res = $this->withToken($token)->getJson("/v1/search/issues?filter[label_id]={$labelId}")->assertStatus(200);
    expect(collect($res->json('data'))->pluck('title'))->toContain('Tagged')->not->toContain('Untagged');
    Workspace::forgetCurrent();
});

it('never returns issues from another workspace', function (): void {
    [$token, $actor, $ws, $team] = searchWorld();
    $ws2 = Workspace::factory()->create();
    $ws2->makeCurrent();
    $team2 = Team::factory()->for($ws2, 'workspace')->create();
    $u2 = User::factory()->for($ws2, 'workspace')->create();
    makeIssue($ws2, $team2, $u2, ['title' => 'FOREIGN']);
    test()->actingInWorkspace($ws);

    $res = $this->withToken($token)->getJson('/v1/search/issues?filter[priority]=no_priority')->assertStatus(200);
    expect(collect($res->json('data'))->pluck('title'))->not->toContain('FOREIGN');
    Workspace::forgetCurrent();
});

it('rejects an invalid filter enum with 422', function (): void {
    [$token] = searchWorld();
    $this->withToken($token)->getJson('/v1/search/issues?filter[priority]=bogus')->assertStatus(422);
    $this->withToken($token)->getJson('/v1/search/issues?filter[source]=bogus')->assertStatus(422);
    $this->withToken($token)->getJson('/v1/search/issues?sort=bogus')->assertStatus(422);
    Workspace::forgetCurrent();
});
