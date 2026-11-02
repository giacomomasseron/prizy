<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('is an Authenticatable whose password is the password_hash column', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $user = User::factory()->for($ws, 'workspace')->create([
        'password_hash' => bcrypt('secret-123'),
    ]);

    expect($user)->toBeInstanceOf(Authenticatable::class);
    expect($user->getAuthPassword())->toBe($user->password_hash);
    expect($user->getAuthIdentifierName())->toBe('id');
    Workspace::forgetCurrent();
});

it('still auto-fills workspace_id and scopes like before (trait behaviour preserved)', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $user = User::create(['name' => 'A', 'email' => 'a@example.com']);
    expect($user->workspace_id)->toBe($ws->id);
    expect($user->workspace)->not->toBeNull();
    Workspace::forgetCurrent();
});

it('ignores a request-supplied workspace_id and uses the current workspace', function (): void {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();
    $a->makeCurrent();
    $user = User::create(['name' => 'X', 'email' => 'x@example.com', 'workspace_id' => $b->id]);
    expect($user->workspace_id)->toBe($a->id); // forged workspace_id ignored
    Workspace::forgetCurrent();
});
