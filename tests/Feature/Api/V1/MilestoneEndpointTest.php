<?php

declare(strict_types=1);

use App\Models\Milestone;
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

/** @return array{0:string,1:Workspace,2:Project} */
function milestoneWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true]);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $project = Project::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'team_id' => $team->id, 'name' => 'P', 'created_by' => $user->id]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $project];
}

it('creates, lists (per project), updates and hard-deletes a milestone', function (): void {
    [$token, $ws, $project] = milestoneWorld();

    $created = $this->withToken($token)->postJson("/v1/projects/{$project->id}/milestones", ['name' => 'Beta', 'target_date' => '2026-03-01']);
    $created->assertStatus(201)->assertJson(['data' => ['name' => 'Beta', 'project_id' => $project->id]]);
    $id = $created->json('data.id');

    $this->withToken($token)->getJson("/v1/projects/{$project->id}/milestones")->assertStatus(200)->assertJsonCount(1, 'data');
    $this->withToken($token)->patchJson("/v1/milestones/{$id}", ['name' => 'Beta 2'])->assertStatus(200);
    $this->withToken($token)->deleteJson("/v1/milestones/{$id}")->assertStatus(204);
    $this->assertDatabaseMissing('milestones', ['id' => $id]);

    Workspace::forgetCurrent();
});

it('returns 404 for a milestone whose project is in another workspace', function (): void {
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $userB = User::factory()->for($wsB, 'workspace')->create();
    $projectB = Project::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $wsB->id, 'name' => 'PB', 'created_by' => $userB->id]);
    $mB = Milestone::create(['id' => (string) Str::uuid(), 'project_id' => $projectB->id, 'name' => 'M', 'target_date' => '2026-03-01']);
    Workspace::forgetCurrent();

    [$token] = milestoneWorld();
    $this->withToken($token)->patchJson("/v1/milestones/{$mB->id}", ['name' => 'hack'])->assertStatus(404);

    Workspace::forgetCurrent();
});
