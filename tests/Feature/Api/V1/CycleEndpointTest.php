<?php

declare(strict_types=1);

use App\Models\Cycle;
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
function cycleWorld(array $userAttrs = []): array
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

it('creates, lists (per team), updates and hard-deletes a cycle', function (): void {
    [$token, $ws, $team] = cycleWorld();

    $created = $this->withToken($token)->postJson("/v1/teams/{$team->id}/cycles", ['name' => 'Sprint 1', 'starts_at' => '2026-01-01', 'ends_at' => '2026-01-14']);
    $created->assertStatus(201)->assertJson(['data' => ['name' => 'Sprint 1', 'team_id' => $team->id]]);
    $id = $created->json('data.id');

    $this->withToken($token)->getJson("/v1/teams/{$team->id}/cycles")->assertStatus(200)->assertJsonCount(1, 'data');
    $this->withToken($token)->patchJson("/v1/cycles/{$id}", ['name' => 'Sprint One'])->assertStatus(200)->assertJson(['data' => ['name' => 'Sprint One']]);
    $this->withToken($token)->deleteJson("/v1/cycles/{$id}")->assertStatus(204);
    $this->assertDatabaseMissing('cycles', ['id' => $id]);

    Workspace::forgetCurrent();
});

it('exposes cooldown_days in cycle resource', function (): void {
    [$token, $ws, $team] = cycleWorld();
    $resp = $this->withToken($token)->postJson("/v1/teams/{$team->id}/cycles", [
        'name' => 'Cool', 'starts_at' => '2026-08-01', 'ends_at' => '2026-08-14',
        'cooldown_days' => 3,
    ]);
    $resp->assertStatus(201)->assertJsonPath('data.cooldown_days', 3);
    Workspace::forgetCurrent();
});

it('rejects ends_at not after starts_at (422)', function (): void {
    [$token, $ws, $team] = cycleWorld();
    $this->withToken($token)->postJson("/v1/teams/{$team->id}/cycles", ['name' => 'S', 'starts_at' => '2026-01-10', 'ends_at' => '2026-01-10'])->assertStatus(422);
    Workspace::forgetCurrent();
});

it('forbids a viewer from creating a cycle (403)', function (): void {
    [$token, , $team] = cycleWorld(['admin_level' => 'viewer', 'is_developer' => false]);
    $this->withToken($token)->postJson("/v1/teams/{$team->id}/cycles", ['name' => 'S', 'starts_at' => '2026-01-01', 'ends_at' => '2026-01-14'])->assertStatus(403);
    Workspace::forgetCurrent();
});

it('returns 422 (not 500) when PATCH sends only ends_at before existing starts_at', function (): void {
    [$token, , $team] = cycleWorld();
    $id = $this->withToken($token)->postJson("/v1/teams/{$team->id}/cycles", ['name' => 'S', 'starts_at' => '2026-03-01', 'ends_at' => '2026-03-15'])->json('data.id');
    $this->withToken($token)->patchJson("/v1/cycles/{$id}", ['ends_at' => '2026-01-01'])->assertStatus(422);
    Workspace::forgetCurrent();
});

it('returns 404 for a cycle whose team is in another workspace (transitive isolation)', function (): void {
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $teamB = Team::factory()->for($wsB, 'workspace')->create();
    $cycleB = Cycle::create(['id' => (string) Str::uuid(), 'team_id' => $teamB->id, 'name' => 'B', 'starts_at' => '2026-01-01', 'ends_at' => '2026-01-14']);
    Workspace::forgetCurrent();

    [$token] = cycleWorld();
    $this->withToken($token)->patchJson("/v1/cycles/{$cycleB->id}", ['name' => 'hack'])->assertStatus(404);

    Workspace::forgetCurrent();
});
