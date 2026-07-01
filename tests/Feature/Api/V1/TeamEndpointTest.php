<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace} token for a user with the given attrs */
function teamWorld(array $userAttrs): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws];
}

it('lets an admin create/update/soft-delete a team', function (): void {
    [$token, $ws] = teamWorld(['admin_level' => 'admin']);

    $created = $this->withToken($token)->postJson('/v1/teams', ['name' => 'Engineering', 'identifier' => 'ENG']);
    $created->assertStatus(201)->assertJson(['data' => ['name' => 'Engineering', 'identifier' => 'ENG']]);
    $id = $created->json('data.id');

    $this->withToken($token)->patchJson("/v1/teams/{$id}", ['name' => 'Eng'])->assertStatus(200);
    $this->withToken($token)->deleteJson("/v1/teams/{$id}")->assertStatus(204);
    $this->assertSoftDeleted('teams', ['id' => $id]);
    $this->withToken($token)->getJson('/v1/teams')->assertStatus(200)->assertJsonCount(0, 'data');

    Workspace::forgetCurrent();
});

it('forbids a non-admin developer from creating a team (403) but allows reads', function (): void {
    [$token] = teamWorld(['admin_level' => 'member', 'is_developer' => true]);

    $this->withToken($token)->postJson('/v1/teams', ['name' => 'X', 'identifier' => 'X'])->assertStatus(403);
    $this->withToken($token)->getJson('/v1/teams')->assertStatus(200);

    Workspace::forgetCurrent();
});

it('rejects a duplicate identifier (422)', function (): void {
    [$token, $ws] = teamWorld(['admin_level' => 'admin']);
    Team::factory()->for($ws, 'workspace')->create(['identifier' => 'ENG']);

    $this->withToken($token)->postJson('/v1/teams', ['name' => 'Y', 'identifier' => 'ENG'])->assertStatus(422);
    $this->withToken($token)->postJson('/v1/teams', ['name' => 'Y', 'identifier' => 'toolongid'])->assertStatus(422);

    Workspace::forgetCurrent();
});

it('allows reusing an identifier after the original team is soft-deleted', function (): void {
    [$token] = teamWorld(['admin_level' => 'admin']);

    $first = $this->withToken($token)->postJson('/v1/teams', ['name' => 'Engineering', 'identifier' => 'ENG']);
    $first->assertStatus(201);
    $id = $first->json('data.id');

    $this->withToken($token)->deleteJson("/v1/teams/{$id}")->assertStatus(204);
    $this->assertSoftDeleted('teams', ['id' => $id]);

    $this->withToken($token)->postJson('/v1/teams', ['name' => 'Engineering 2', 'identifier' => 'ENG'])->assertStatus(201);

    Workspace::forgetCurrent();
});

it('refuses to delete a team that still has issues (422)', function (): void {
    [$token, $ws] = teamWorld(['admin_level' => 'admin']);
    $team = Team::factory()->for($ws, 'workspace')->create();
    $dev = User::factory()->for($ws, 'workspace')->create();
    Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $dev->id]);

    $this->withToken($token)->deleteJson("/v1/teams/{$team->id}")->assertStatus(422);
    $this->assertDatabaseHas('teams', ['id' => $team->id, 'deleted_at' => null]);

    Workspace::forgetCurrent();
});
