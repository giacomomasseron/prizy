<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

it('creates a workspace and owner user, logs them in, and dispatches a verification notification', function (): void {
    Notification::fake();

    $response = $this->postJson('/workspaces', [
        'workspace_name' => 'Acme Corp',
        'slug'           => 'acme',
        'name'           => 'Alice',
        'email'          => 'alice@example.com',
        'password'       => 'password123',
    ]);

    $response->assertStatus(201);

    // Workspace row created
    $this->assertDatabaseHas('workspaces', ['slug' => 'acme', 'name' => 'Acme Corp']);
    $workspace = Workspace::where('slug', 'acme')->firstOrFail();

    // Set current workspace so WorkspaceScope lets us query the user
    $workspace->makeCurrent();

    // User row created with correct attributes
    $user = User::where('email', 'alice@example.com')->firstOrFail();
    expect($user->admin_level)->toBe('owner');
    expect($user->workspace_id)->toBe($workspace->id);
    expect(Hash::check('password123', $user->password_hash))->toBeTrue();
    expect($user->email_verified_at)->toBeNull();

    Workspace::forgetCurrent();

    // Session: the owner is logged in
    $this->assertAuthenticatedAs($user);

    // Verification notification sent
    Notification::assertSentTo($user, VerifyEmail::class);
});

it('rejects a duplicate slug with 422', function (): void {
    Workspace::factory()->create(['slug' => 'taken']);

    $response = $this->postJson('/workspaces', [
        'workspace_name' => 'Another Corp',
        'slug'           => 'taken',
        'name'           => 'Bob',
        'email'          => 'bob@example.com',
        'password'       => 'password123',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['slug']);
});

it('rejects a password shorter than 8 characters with 422', function (): void {
    $response = $this->postJson('/workspaces', [
        'workspace_name' => 'Acme Corp',
        'slug'           => 'acme2',
        'name'           => 'Carol',
        'email'          => 'carol@example.com',
        'password'       => 'short',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['password']);
});
