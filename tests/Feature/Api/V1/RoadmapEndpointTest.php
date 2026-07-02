<?php

declare(strict_types=1);

use App\Models\Milestone;
use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} */
function roadmapWorld(array $attrs = []): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now(), 'is_developer' => true, 'admin_level' => 'member'], $attrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function makeProject(Workspace $ws, User $user, array $attrs = []): Project
{
    return Project::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Proj', 'color' => '#4f46e5',
        'status' => 'in_progress', 'created_by' => $user->id, 'start_date' => '2026-07-01', 'target_date' => '2026-09-30',
    ], $attrs));
}

it('returns projects each with their milestones', function (): void {
    [$token, $ws, $user] = roadmapWorld();
    $project = makeProject($ws, $user, ['name' => 'Website']);
    Milestone::create(['id' => (string) Str::uuid(), 'project_id' => $project->id, 'name' => 'Beta', 'target_date' => '2026-08-01']);
    Milestone::create(['id' => (string) Str::uuid(), 'project_id' => $project->id, 'name' => 'GA', 'target_date' => '2026-09-15']);

    $res = $this->withToken($token)->getJson('/v1/roadmap');
    $res->assertStatus(200)->assertJsonCount(1, 'data')->assertJsonCount(2, 'data.0.milestones');
    expect($res->json('data.0.name'))->toBe('Website');
    expect(collect($res->json('data.0.milestones'))->pluck('name')->all())->toContain('Beta', 'GA');

    Workspace::forgetCurrent();
});

it('is workspace-scoped', function (): void {
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $uB = User::factory()->for($wsB, 'workspace')->create();
    makeProject($wsB, $uB, ['name' => 'ForeignProj']);
    Workspace::forgetCurrent();

    [$token] = roadmapWorld();
    $res = $this->withToken($token)->getJson('/v1/roadmap');
    $res->assertStatus(200)->assertJsonCount(0, 'data');

    Workspace::forgetCurrent();
});

it('is readable by any member (viewer)', function (): void {
    [$token] = roadmapWorld(['admin_level' => 'viewer', 'is_developer' => false]);
    $this->withToken($token)->getJson('/v1/roadmap')->assertStatus(200);
    Workspace::forgetCurrent();
});
