<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use App\Models\UserPlanItem;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

// Today v2's left bar: GET /v1/projects?filter[mine]=true lists the caller's projects.

afterEach(fn () => Workspace::forgetCurrent());

/** @return array{token:string, user:User, other:User, project:Closure(string, array):Project, issue:Closure(Project, array):Issue} */
function myProjectsWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $other = User::factory()->for($ws, 'workspace')->create(['is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $project = fn (string $name, array $attrs = []): Project => Project::factory()->for($ws, 'workspace')->create(array_merge(
        ['name' => $name, 'created_by' => $user->id, 'status' => 'in_progress', 'lead_id' => null],
        $attrs,
    ));
    $issue = fn (Project $p, array $attrs = []): Issue => Issue::factory()->for($ws, 'workspace')->create(array_merge(
        ['team_id' => $team->id, 'project_id' => $p->id, 'created_by' => $user->id, 'assignee_id' => null, 'status' => 'todo'],
        $attrs,
    ));

    return ['token' => app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'], 'user' => $user, 'other' => $other, 'project' => $project, 'issue' => $issue];
}

/** @return list<string> */
function myProjectsNames($res): array
{
    $names = collect($res->json('data'))->pluck('name')->all();
    sort($names);

    return $names;
}

it('lists the projects you lead or that hold an open issue assigned to you or on your plan', function (): void {
    ['token' => $token, 'user' => $user, 'other' => $other, 'project' => $project, 'issue' => $issue] = myProjectsWorld();

    $project('Led', ['lead_id' => $user->id]);
    $issue($project('Assigned'), ['assignee_id' => $user->id]);
    $planned = $issue($project('Planned'), ['assignee_id' => $other->id]);
    UserPlanItem::query()->create(['user_id' => $user->id, 'issue_id' => $planned->id, 'position' => 1, 'minutes' => 60]);

    // Not yours: led by someone else, assigned to someone else, on someone else's plan, or only closed work.
    $project('Their lead', ['lead_id' => $other->id]);
    $issue($project('Their issue'), ['assignee_id' => $other->id]);
    $theirPlan = $issue($project('Their plan'));
    UserPlanItem::query()->create(['user_id' => $other->id, 'issue_id' => $theirPlan->id, 'position' => 1, 'minutes' => 60]);
    $issue($project('Done'), ['assignee_id' => $user->id, 'status' => 'done', 'completed_at' => now()]);
    $issue($project('Cancelled'), ['assignee_id' => $user->id, 'status' => 'cancelled']);
    $issue($project('Archived'), ['assignee_id' => $user->id, 'archived_at' => now()]);
    $issue($project('Deleted'), ['assignee_id' => $user->id])->delete();
    $closedPlan = $issue($project('Closed plan'), ['status' => 'done', 'completed_at' => now()]);
    UserPlanItem::query()->create(['user_id' => $user->id, 'issue_id' => $closedPlan->id, 'position' => 2, 'minutes' => 60]);
    $project('Empty');

    $res = $this->withToken($token)->getJson('/v1/projects?filter[mine]=true')->assertStatus(200);

    expect(myProjectsNames($res))->toBe(['Assigned', 'Led', 'Planned']);
});

it('combines with the status filter: neither can widen the other', function (): void {
    ['token' => $token, 'user' => $user, 'other' => $other, 'project' => $project, 'issue' => $issue] = myProjectsWorld();

    $project('Active', ['lead_id' => $user->id, 'status' => 'in_progress']);
    $project('Finished', ['lead_id' => $user->id, 'status' => 'completed']);
    // Yours only through an open issue: the status filter must still keep it out.
    $issue($project('Finished with work', ['status' => 'completed']), ['assignee_id' => $user->id]);
    // Active but not yours: mine must still keep it out.
    $project('Active, theirs', ['lead_id' => $other->id, 'status' => 'in_progress']);

    $res = $this->withToken($token)->getJson('/v1/projects?filter[mine]=true&filter[status]=planning,in_progress,paused')->assertStatus(200);

    expect(myProjectsNames($res))->toBe(['Active']);
});

it('reads mine as a boolean, and leaves the list whole without it', function (): void {
    ['token' => $token, 'user' => $user, 'other' => $other, 'project' => $project] = myProjectsWorld();

    $project('Mine', ['lead_id' => $user->id]);
    $project('Theirs', ['lead_id' => $other->id]);

    expect(myProjectsNames($this->withToken($token)->getJson('/v1/projects?filter[mine]=1')))->toBe(['Mine']);
    expect(myProjectsNames($this->withToken($token)->getJson('/v1/projects')))->toBe(['Mine', 'Theirs']);
    expect(myProjectsNames($this->withToken($token)->getJson('/v1/projects?filter[mine]=false')))->toBe(['Mine', 'Theirs']);
});

it('keeps the filters on the next page link', function (): void {
    ['token' => $token, 'user' => $user, 'other' => $other, 'project' => $project] = myProjectsWorld();

    // Theirs sits between yours: an unfiltered second page would start with it.
    $project('First', ['lead_id' => $user->id, 'created_at' => now()->subMinutes(3)]);
    $project('Theirs', ['lead_id' => $other->id, 'created_at' => now()->subMinutes(2)]);
    $project('Second', ['lead_id' => $user->id, 'created_at' => now()->subMinute()]);

    $first = $this->withToken($token)->getJson('/v1/projects?filter[mine]=true&limit=1')->assertStatus(200);
    expect(myProjectsNames($first))->toBe(['First']);
    $next = (string) $first->json('links.next');
    parse_str((string) parse_url($next, PHP_URL_QUERY), $nextParams);
    expect($nextParams['filter']['mine'] ?? null)->toBe('true');

    $second = $this->withToken($token)->getJson(parse_url($next, PHP_URL_PATH).'?'.parse_url($next, PHP_URL_QUERY))->assertStatus(200);
    expect(myProjectsNames($second))->toBe(['Second']);
});
