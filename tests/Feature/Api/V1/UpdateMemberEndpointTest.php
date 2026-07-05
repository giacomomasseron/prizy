<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function patchWorld(string $actorLevel, string $targetLevel, bool $sameWorkspace = true): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $actor = User::factory()->for($ws, 'workspace')->create([
        'email_verified_at' => now(), 'admin_level' => $actorLevel, 'is_developer' => true,
    ]);
    $wsTarget = $sameWorkspace ? $ws : Workspace::factory()->create();
    if (!$sameWorkspace) {
        $wsTarget->makeCurrent();
    }
    $target = User::factory()->for($wsTarget, 'workspace')->create([
        'email_verified_at' => now(), 'admin_level' => $targetLevel, 'is_developer' => false,
    ]);
    if (!$sameWorkspace) {
        test()->actingInWorkspace($ws);
    }
    $token = app(CreatePersonalAccessToken::class)->handle($actor, 't', null)['token'];
    return [$token, $actor, $target, $ws];
}

it('owner can change a member level', function (): void {
    [$token, , $target] = patchWorld('owner', 'member');
    $this->withToken($token)->patchJson("/v1/members/{$target->id}", ['admin_level' => 'admin'])
        ->assertStatus(200)->assertJson(['data' => ['admin_level' => 'admin']]);
    Workspace::forgetCurrent();
});

it('owner can toggle capabilities', function (): void {
    [$token, , $target] = patchWorld('owner', 'member');
    $this->withToken($token)->patchJson("/v1/members/{$target->id}", ['is_developer' => true])
        ->assertStatus(200)->assertJson(['data' => ['is_developer' => true]]);
    Workspace::forgetCurrent();
});

it('admin can toggle capabilities on any member', function (): void {
    [$token, , $target] = patchWorld('admin', 'member');
    $this->withToken($token)->patchJson("/v1/members/{$target->id}", ['is_agent' => true])
        ->assertStatus(200)->assertJson(['data' => ['is_agent' => true]]);
    Workspace::forgetCurrent();
});

it('non-admin gets 403', function (): void {
    [$token, , $target] = patchWorld('member', 'member');
    $this->withToken($token)->patchJson("/v1/members/{$target->id}", ['admin_level' => 'admin'])
        ->assertStatus(403);
    Workspace::forgetCurrent();
});

it('admin cannot modify an owner', function (): void {
    [$token, , $target] = patchWorld('admin', 'owner');
    $this->withToken($token)->patchJson("/v1/members/{$target->id}", ['is_developer' => true])
        ->assertStatus(403);
    expect($target->fresh()->is_developer)->toBeFalse(); // DB unchanged
    Workspace::forgetCurrent();
});

it('admin cannot set anyone to owner', function (): void {
    [$token, , $target] = patchWorld('admin', 'member');
    $this->withToken($token)->patchJson("/v1/members/{$target->id}", ['admin_level' => 'owner'])
        ->assertStatus(403);
    expect($target->fresh()->admin_level)->toBe('member'); // DB unchanged
    Workspace::forgetCurrent();
});

it('the sole owner cannot demote themselves (workspace keeps an owner)', function (): void {
    [$token, $actor] = patchWorld('owner', 'member');
    // Actor is the sole owner; patching their own admin_level triggers the self-demote guard (reachable path)
    $this->withToken($token)->patchJson("/v1/members/{$actor->id}", ['admin_level' => 'member'])
        ->assertStatus(403);
    expect($actor->fresh()->admin_level)->toBe('owner'); // level unchanged in DB
    Workspace::forgetCurrent();
});

it('cannot change own admin level', function (): void {
    [$token, $actor] = patchWorld('owner', 'member');
    // Two owners so last-owner guard doesn't fire first
    User::factory()->for($actor->workspace, 'workspace')->create(['admin_level' => 'owner', 'email_verified_at' => now()]);
    $this->withToken($token)->patchJson("/v1/members/{$actor->id}", ['admin_level' => 'admin'])
        ->assertStatus(403);
    Workspace::forgetCurrent();
});

it('returns 404 for a user in another workspace', function (): void {
    [$token, , $target] = patchWorld('owner', 'member', false);
    $this->withToken($token)->patchJson("/v1/members/{$target->id}", ['admin_level' => 'admin'])
        ->assertStatus(404);
    Workspace::forgetCurrent();
});

it('rejects invalid admin_level value', function (): void {
    [$token, , $target] = patchWorld('owner', 'member');
    $this->withToken($token)->patchJson("/v1/members/{$target->id}", ['admin_level' => 'superadmin'])
        ->assertStatus(422);
    Workspace::forgetCurrent();
});
