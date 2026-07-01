<?php

declare(strict_types=1);

use App\Models\Label;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace} bearer token for a verified developer + workspace */
function labelWorld(array $userAttrs = []): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(
        ['email_verified_at' => now(), 'is_developer' => true, 'admin_level' => 'member'],
        $userAttrs,
    ));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws];
}

it('creates, lists, updates and deletes a label', function (): void {
    [$token, $ws] = labelWorld();

    $created = $this->withToken($token)->postJson('/v1/labels', ['name' => 'Bug', 'color' => '#ff0000']);
    $created->assertStatus(201)->assertJson(['data' => ['name' => 'Bug', 'color' => '#ff0000']]);
    $id = $created->json('data.id');

    $this->withToken($token)->getJson('/v1/labels')->assertStatus(200)->assertJsonCount(1, 'data');
    $this->withToken($token)->patchJson("/v1/labels/{$id}", ['name' => 'Defect'])
        ->assertStatus(200)->assertJson(['data' => ['name' => 'Defect']]);
    $this->withToken($token)->deleteJson("/v1/labels/{$id}")->assertStatus(204);
    $this->assertDatabaseMissing('labels', ['id' => $id]);

    Workspace::forgetCurrent();
});

it('rejects a duplicate label name (422) and a bad color', function (): void {
    [$token, $ws] = labelWorld();
    Label::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Bug', 'color' => '#ff0000']);

    $this->withToken($token)->postJson('/v1/labels', ['name' => 'Bug', 'color' => '#ff0000'])->assertStatus(422);
    $this->withToken($token)->postJson('/v1/labels', ['name' => 'X', 'color' => 'red'])->assertStatus(422);

    Workspace::forgetCurrent();
});

it('forbids a viewer from creating and allows any member to read', function (): void {
    [$token] = labelWorld(['admin_level' => 'viewer', 'is_developer' => false]);

    $this->withToken($token)->postJson('/v1/labels', ['name' => 'Y', 'color' => '#00ff00'])->assertStatus(403);
    $this->withToken($token)->getJson('/v1/labels')->assertStatus(200);

    Workspace::forgetCurrent();
});

it('returns 404 for a label in another workspace', function (): void {
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $labelB = Label::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $wsB->id, 'name' => 'B', 'color' => '#0000ff']);
    Workspace::forgetCurrent();

    [$token] = labelWorld();
    $this->withToken($token)->getJson("/v1/labels/{$labelB->id}")->assertStatus(404);

    Workspace::forgetCurrent();
});
