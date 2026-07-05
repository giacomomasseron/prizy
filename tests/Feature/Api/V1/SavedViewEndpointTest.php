<?php

declare(strict_types=1);

use App\Models\SavedView;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} token for a user with the given attrs */
function savedViewWorld(array $attrs = []): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(
        ['email_verified_at' => now(), 'is_developer' => true, 'admin_level' => 'member'],
        $attrs,
    ));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

$validDef = ['filter' => ['status' => 'todo,in_progress', 'label_id' => 'x'], 'sort' => '-created_at', 'view_type' => 'board'];

it('creates, lists, updates and deletes a saved view', function () use ($validDef): void {
    [$token] = savedViewWorld();

    $created = $this->withToken($token)->postJson('/v1/saved-views', ['name' => 'Active board', 'definition' => $validDef]);
    $created->assertStatus(201)->assertJson(['data' => ['name' => 'Active board', 'definition' => ['view_type' => 'board']]]);
    $id = $created->json('data.id');

    $this->withToken($token)->getJson('/v1/saved-views')->assertStatus(200)->assertJsonCount(1, 'data');
    $this->withToken($token)->patchJson("/v1/saved-views/{$id}", ['name' => 'Renamed'])->assertStatus(200)->assertJson(['data' => ['name' => 'Renamed']]);
    $this->withToken($token)->deleteJson("/v1/saved-views/{$id}")->assertStatus(204);
    $this->assertDatabaseMissing('saved_views', ['id' => $id]);

    Workspace::forgetCurrent();
});

it('rejects an invalid definition (bad view_type, unknown filter key, bad sort)', function (): void {
    [$token] = savedViewWorld();
    $this->withToken($token)->postJson('/v1/saved-views', ['name' => 'X', 'definition' => ['view_type' => 'gantt']])->assertStatus(422);
    $this->withToken($token)->postJson('/v1/saved-views', ['name' => 'X', 'definition' => ['view_type' => 'list', 'filter' => ['bogus' => '1']]])->assertStatus(422);
    $this->withToken($token)->postJson('/v1/saved-views', ['name' => 'X', 'definition' => ['view_type' => 'list', 'sort' => 'not_a_column']])->assertStatus(422);
    Workspace::forgetCurrent();
});

it('forbids a viewer from creating and allows any member to read', function () use ($validDef): void {
    [$token] = savedViewWorld(['admin_level' => 'viewer', 'is_developer' => false]);
    $this->withToken($token)->postJson('/v1/saved-views', ['name' => 'X', 'definition' => $validDef])->assertStatus(403);
    $this->withToken($token)->getJson('/v1/saved-views')->assertStatus(200);
    Workspace::forgetCurrent();
});

it('lets the creator or an admin edit/delete but forbids another non-admin developer', function () use ($validDef): void {
    [$ownerToken, $ws, $creator] = savedViewWorld();
    $view = SavedView::create(['id' => (string) Str::uuid(), 'name' => 'Shared', 'created_by' => $creator->id, 'definition' => $validDef]);

    // Another developer (not creator, not admin) → 403 on update/delete.
    $otherDev = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => true, 'admin_level' => 'member']);
    $otherToken = app(CreatePersonalAccessToken::class)->handle($otherDev, 't', null)['token'];
    $this->withToken($otherToken)->patchJson("/v1/saved-views/{$view->id}", ['name' => 'Nope'])->assertStatus(403);

    // An admin (not the creator) → allowed.
    $admin = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now(), 'is_developer' => false, 'admin_level' => 'admin']);
    $adminToken = app(CreatePersonalAccessToken::class)->handle($admin, 't', null)['token'];
    $this->withToken($adminToken)->patchJson("/v1/saved-views/{$view->id}", ['name' => 'AdminEdit'])->assertStatus(200);

    Workspace::forgetCurrent();
});

it('returns 404 for a saved view in another workspace', function () use ($validDef): void {
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    $uB = User::factory()->for($wsB, 'workspace')->create();
    $viewB = SavedView::create(['id' => (string) Str::uuid(), 'name' => 'B', 'created_by' => $uB->id, 'definition' => $validDef]);
    Workspace::forgetCurrent();

    [$token] = savedViewWorld();
    $this->withToken($token)->getJson("/v1/saved-views/{$viewB->id}")->assertStatus(404);
    Workspace::forgetCurrent();
});

it('rejects a definition patch without view_type but allows a name-only patch', function () use ($validDef): void {
    [$token, , $creator] = savedViewWorld();
    $view = SavedView::create(['id' => (string) Str::uuid(), 'name' => 'Original', 'created_by' => $creator->id, 'definition' => $validDef]);

    // PATCH with a definition that is missing view_type → 422.
    $this->withToken($token)
        ->patchJson("/v1/saved-views/{$view->id}", ['definition' => ['filter' => ['status' => 'todo']]])
        ->assertStatus(422);

    // PATCH with only a name change (no definition) → 200.
    $this->withToken($token)
        ->patchJson("/v1/saved-views/{$view->id}", ['name' => 'Renamed'])
        ->assertStatus(200)
        ->assertJson(['data' => ['name' => 'Renamed']]);

    Workspace::forgetCurrent();
});

it('accepts advanced-search sort values on create and update', function (): void {
    [$token] = savedViewWorld();

    $firstId = null;
    foreach (['updated', 'priority', 'status'] as $sort) {
        $response = $this->withToken($token)
            ->postJson('/v1/saved-views', [
                'name'       => "V {$sort}",
                'definition' => ['filter' => [], 'sort' => $sort, 'view_type' => 'list'],
            ]);
        $response->assertStatus(201);
        if ($firstId === null) {
            $firstId = $response->json('data.id');
        }
    }

    $this->withToken($token)
        ->patchJson("/v1/saved-views/{$firstId}", [
            'definition' => ['filter' => [], 'sort' => 'status', 'view_type' => 'list'],
        ])
        ->assertStatus(200);

    Workspace::forgetCurrent();
});
