<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

it('does NOT gate GET /v1/teams (shared with the notifications rail)', function (): void {
    [$token] = trackerAuthWorld(['is_developer' => false, 'is_agent' => true, 'admin_level' => 'member']);
    $this->withToken($token)->getJson('/v1/teams')->assertStatus(200);
    Workspace::forgetCurrent();
});
