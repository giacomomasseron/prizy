<?php

declare(strict_types=1);

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

/** @return array{0:string,1:Workspace,2:Team} */
function projectWorld(array $userAttrs = []): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(
        ['email_verified_at' => now(), 'is_developer' => true, 'admin_level' => 'member'],
        $userAttrs,
    ));
    $team = Team::factory()->for($ws, 'workspace')->create();
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $team];
}

it('creates, filters, updates and soft-deletes a project', function (): void {
    [$token, $ws, $team] = projectWorld();

    $created = $this->withToken($token)->postJson('/v1/projects', ['name' => 'Launch', 'team_id' => $team->id, 'status' => 'in_progress']);
    $created->assertStatus(201)->assertJson(['data' => ['name' => 'Launch', 'status' => 'in_progress', 'team_id' => $team->id]]);
    $id = $created->json('data.id');

    $this->withToken($token)->getJson('/v1/projects?filter[status]=in_progress')->assertStatus(200)->assertJsonCount(1, 'data');
    $this->withToken($token)->getJson('/v1/projects?filter[status]=planning')->assertStatus(200)->assertJsonCount(0, 'data');
    $this->withToken($token)->patchJson("/v1/projects/{$id}", ['status' => 'completed'])->assertStatus(200)->assertJson(['data' => ['status' => 'completed']]);
    $this->withToken($token)->deleteJson("/v1/projects/{$id}")->assertStatus(204);
    $this->assertSoftDeleted('projects', ['id' => $id]);
    $this->withToken($token)->getJson('/v1/projects')->assertJsonCount(0, 'data');

    Workspace::forgetCurrent();
});

it('exposes lead_id, priority, and cooldown_days in resources after migration', function (): void {
    [$token, $ws, $team] = projectWorld();
    $resp = $this->withToken($token)->postJson('/v1/projects', [
        'name' => 'Lead test', 'priority' => 'high',
    ]);
    $resp->assertStatus(201)
         ->assertJsonPath('data.priority', 'high')
         ->assertJsonPath('data.lead_id', null);
    Workspace::forgetCurrent();
});

it('rejects a bad status, target_date before start_date, and a foreign team_id', function (): void {
    [$token] = projectWorld();

    $this->withToken($token)->postJson('/v1/projects', ['name' => 'X', 'status' => 'wat'])->assertStatus(422);
    $this->withToken($token)->postJson('/v1/projects', ['name' => 'X', 'start_date' => '2026-02-01', 'target_date' => '2026-01-01'])->assertStatus(422);
    $this->withToken($token)->postJson('/v1/projects', ['name' => 'X', 'team_id' => (string) Str::uuid()])->assertStatus(422);

    Workspace::forgetCurrent();
});

it('forbids a viewer from creating a project (403)', function (): void {
    [$token] = projectWorld(['admin_level' => 'viewer', 'is_developer' => false]);
    $this->withToken($token)->postJson('/v1/projects', ['name' => 'X'])->assertStatus(403);
    Workspace::forgetCurrent();
});

it('returns 422 (not 500) when PATCH sends target_date before existing start_date', function (): void {
    [$token, $ws, $team] = projectWorld();
    $id = $this->withToken($token)->postJson('/v1/projects', ['name' => 'Dated', 'team_id' => $team->id, 'start_date' => '2026-03-01', 'target_date' => '2026-06-01'])->json('data.id');
    $this->withToken($token)->patchJson("/v1/projects/{$id}", ['target_date' => '2026-01-01'])->assertStatus(422);
    Workspace::forgetCurrent();
});

it('rejects a foreign-workspace lead_id on POST with 422', function (): void {
    [$token, $ws] = projectWorld();

    // Create a user in a different workspace (RLS-context sandwich).
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $foreignUser = User::factory()->for($wsB, 'workspace')->create(['email_verified_at' => now()]);
    Workspace::forgetCurrent();

    // Restore workspace A for the acting token.
    test()->actingInWorkspace($ws);

    $this->withToken($token)
         ->postJson('/v1/projects', ['name' => 'X', 'lead_id' => $foreignUser->id])
         ->assertStatus(422)
         ->assertJsonValidationErrors('lead_id');

    Workspace::forgetCurrent();
});

it('rejects a foreign-workspace lead_id on PATCH with 422', function (): void {
    [$token, $ws] = projectWorld();

    $id = $this->withToken($token)
               ->postJson('/v1/projects', ['name' => 'Base'])
               ->json('data.id');

    // Create a user in a different workspace (RLS-context sandwich).
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $foreignUser = User::factory()->for($wsB, 'workspace')->create(['email_verified_at' => now()]);
    Workspace::forgetCurrent();

    // Restore workspace A for the acting token.
    test()->actingInWorkspace($ws);

    $this->withToken($token)
         ->patchJson("/v1/projects/{$id}", ['lead_id' => $foreignUser->id])
         ->assertStatus(422)
         ->assertJsonValidationErrors('lead_id');

    Workspace::forgetCurrent();
});

it('accepts a same-workspace member as lead_id and persists it', function (): void {
    [$token, $ws] = projectWorld();

    $lead = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);

    $resp = $this->withToken($token)
                 ->postJson('/v1/projects', ['name' => 'Led Project', 'lead_id' => $lead->id]);

    $resp->assertStatus(201)->assertJsonPath('data.lead_id', $lead->id);

    Workspace::forgetCurrent();
});

it('projects list includes lead, issue_count, and progress', function (): void {
    [$token, $ws, $team] = projectWorld();
    $lead = User::factory()->for($ws, 'workspace')->create(['name' => 'Lena Ops']);
    $project = Project::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'team_id' => $team->id,
        'name' => 'Proj', 'status' => 'in_progress', 'priority' => 'no_priority',
        'color' => '#6d69f2', 'lead_id' => $lead->id, 'created_by' => $lead->id,
    ]);
    foreach (['done', 'done', 'todo', 'backlog'] as $st) {
        Issue::forceCreate([
            'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'team_id' => $team->id,
            'project_id' => $project->id, 'created_by' => $lead->id, 'title' => 'I',
            'status' => $st, 'priority' => 'no_priority',
        ]);
    }
    $row = collect($this->withToken($token)->getJson('/v1/projects')->assertStatus(200)->json('data'))
        ->firstWhere('id', $project->id);
    expect($row['lead'])->toMatchArray(['id' => $lead->id, 'name' => 'Lena Ops']);
    expect($row['issue_count'])->toBe(4);
    expect($row['progress'])->toBe(50);            // 2 of 4 done
});

it('project with no issues reports progress 0 and lead null', function (): void {
    [$token, $ws, $team] = projectWorld();
    $creator = User::factory()->for($ws, 'workspace')->create();
    $project = Project::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'team_id' => $team->id,
        'name' => 'Empty', 'status' => 'planning', 'priority' => 'no_priority',
        'color' => '#6d69f2', 'lead_id' => null, 'created_by' => $creator->id,
    ]);
    $row = collect($this->withToken($token)->getJson('/v1/projects')->json('data'))->firstWhere('id', $project->id);
    expect($row['issue_count'])->toBe(0);
    expect($row['progress'])->toBe(0);
    expect($row['lead'])->toBeNull();
});

it('does not leak projects from another workspace', function (): void {
    [$token, $ws, $team] = projectWorld();
    $ws2 = Workspace::factory()->create();
    $ws2->makeCurrent();
    $team2 = Team::factory()->for($ws2, 'workspace')->create();
    $ws2User = User::factory()->for($ws2, 'workspace')->create();
    Project::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws2->id, 'team_id' => $team2->id, 'name' => 'FOREIGN', 'status' => 'planning', 'priority' => 'no_priority', 'color' => '#fff', 'created_by' => $ws2User->id]);
    test()->actingInWorkspace($ws);
    $names = collect($this->withToken($token)->getJson('/v1/projects')->json('data'))->pluck('name');
    expect($names)->not->toContain('FOREIGN');
});

it('records created_by as the acting user', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create([
        'email_verified_at' => now(),
        'is_developer'      => true,
        'admin_level'       => 'member',
    ]);
    $team  = Team::factory()->for($ws, 'workspace')->create();
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $response = $this->withToken($token)->postJson('/v1/projects', [
        'name'    => 'Created-By Test',
        'team_id' => $team->id,
    ]);

    $response->assertStatus(201);
    expect($response->json('data.created_by'))->toBe($user->id);
    $this->assertDatabaseHas('projects', [
        'id'         => $response->json('data.id'),
        'created_by' => $user->id,
    ]);

    Workspace::forgetCurrent();
});
