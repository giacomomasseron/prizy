<?php

declare(strict_types=1);

use App\Models\Cycle;
use App\Models\Issue;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/**
 * @param  array<string,mixed>  $flags
 * @return array{0:string,1:Workspace}
 */
function trackerAuthWorld(array $flags): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $flags));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws];
}

/** @return list<string> the six gated tracker list URLs for the given workspace */
function trackerListUrls(Workspace $ws): array
{
    $team = Team::factory()->for($ws, 'workspace')->create();
    $project = Project::factory()->for($ws, 'workspace')->create();

    return [
        '/v1/issues',
        '/v1/projects',
        '/v1/labels',
        '/v1/saved-views',
        "/v1/teams/{$team->id}/cycles",
        "/v1/projects/{$project->id}/milestones",
    ];
}

it('403s every tracker list endpoint for an agent-only user', function (): void {
    [$token, $ws] = trackerAuthWorld(['is_developer' => false, 'is_agent' => true, 'admin_level' => 'member']);
    foreach (trackerListUrls($ws) as $url) {
        $this->withToken($token)->getJson($url)->assertStatus(403);
    }
    Workspace::forgetCurrent();
});

it('200s every tracker list endpoint for a developer', function (): void {
    [$token, $ws] = trackerAuthWorld(['is_developer' => true, 'is_agent' => false, 'admin_level' => 'member']);
    foreach (trackerListUrls($ws) as $url) {
        $this->withToken($token)->getJson($url)->assertStatus(200);
    }
    Workspace::forgetCurrent();
});

it('200s the issues list for an owner without is_developer (Gate::before)', function (): void {
    [$token] = trackerAuthWorld(['is_developer' => false, 'is_agent' => false, 'admin_level' => 'owner']);
    $this->withToken($token)->getJson('/v1/issues')->assertStatus(200);
    Workspace::forgetCurrent();
});

it('still lets an agent read a single issue (ticket→issue bridge preserved)', function (): void {
    [$token, $ws] = trackerAuthWorld(['is_developer' => false, 'is_agent' => true, 'admin_level' => 'member']);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id]);
    $this->withToken($token)->getJson("/v1/issues/{$issue->id}")->assertStatus(200);
    Workspace::forgetCurrent();
});

it('embeds project + cycle names on the single issue so the bridge shows them without the gated lists', function (): void {
    [$token, $ws] = trackerAuthWorld(['is_developer' => false, 'is_agent' => true, 'admin_level' => 'member']);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $project = Project::factory()->for($ws, 'workspace')->create(['name' => 'Bridge Project']);
    $cycle = Cycle::create(['id' => (string) Str::uuid(), 'team_id' => $team->id, 'name' => 'Bridge Cycle', 'starts_at' => '2026-01-01', 'ends_at' => '2026-01-14']);
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'project_id' => $project->id, 'cycle_id' => $cycle->id]);

    // The agent (is_developer=false) cannot list /v1/projects or /v1/cycles, so the detail
    // page relies on these embedded names to render the Project/Cycle rows correctly.
    $this->withToken($token)->getJson("/v1/issues/{$issue->id}")
        ->assertStatus(200)
        ->assertJsonPath('data.project.name', 'Bridge Project')
        ->assertJsonPath('data.cycle.name', 'Bridge Cycle');
    Workspace::forgetCurrent();
});

it('does NOT gate GET /v1/teams (shared with the notifications rail)', function (): void {
    [$token] = trackerAuthWorld(['is_developer' => false, 'is_agent' => true, 'admin_level' => 'member']);
    $this->withToken($token)->getJson('/v1/teams')->assertStatus(200);
    Workspace::forgetCurrent();
});
