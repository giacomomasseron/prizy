<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Label;
use App\Models\Team;
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

it('forbids a viewer (non-developer) from creating or listing', function (): void {
    [$token] = labelWorld(['admin_level' => 'viewer', 'is_developer' => false]);

    $this->withToken($token)->postJson('/v1/labels', ['name' => 'Y', 'color' => '#00ff00'])->assertStatus(403);
    $this->withToken($token)->getJson('/v1/labels')->assertStatus(403);

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

it('creates and returns a grouped label with issue_count', function (): void {
    [$token, $ws] = labelWorld();
    $res = $this->withToken($token)->postJson('/v1/labels', ['name' => 'Bug', 'color' => '#ff0000', 'group' => 'Type']);
    $res->assertStatus(201)->assertJson(['data' => ['name' => 'Bug', 'group' => 'Type', 'issue_count' => 0]]);
    $this->withToken($token)->getJson('/v1/labels')->assertStatus(200)
        ->assertJsonPath('data.0.group', 'Type')
        ->assertJsonPath('data.0.issue_count', 0);
    Workspace::forgetCurrent();
});

it('clears a label group when patched with an empty string', function (): void {
    [$token, $ws] = labelWorld();
    $id = $this->withToken($token)->postJson('/v1/labels', ['name' => 'Sev1', 'group' => 'Severity'])->json('data.id');
    $this->withToken($token)->patchJson("/v1/labels/{$id}", ['group' => ''])->assertStatus(200)
        ->assertJsonPath('data.group', null);
    Workspace::forgetCurrent();
});

it('counts label usage across issues', function (): void {
    [$token, $ws] = labelWorld();
    $user = User::where('workspace_id', $ws->id)->first();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $i1 = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);
    $i2 = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $user->id]);
    $id = $this->withToken($token)->postJson('/v1/labels', ['name' => 'Perf'])->json('data.id');
    $this->withToken($token)->putJson("/v1/issues/{$i1->id}/labels", ['label_ids' => [$id]])->assertStatus(200);
    $this->withToken($token)->putJson("/v1/issues/{$i2->id}/labels", ['label_ids' => [$id]])->assertStatus(200);
    $this->withToken($token)->getJson('/v1/labels')->assertStatus(200)->assertJsonPath('data.0.issue_count', 2);
    Workspace::forgetCurrent();
});
