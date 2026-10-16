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

it('creates a workspace and owner user, hands back a login link for their workspace, and dispatches a verification notification', function (): void {
    Notification::fake();

    $response = $this->postJson('/workspaces', [
        'workspace_name' => 'Acme Corp',
        'slug'           => 'acme',
        'name'           => 'Alice',
        'email'          => 'alice@example.com',
        'password'       => 'password123',
    ]);

    $response->assertStatus(201);
    expect($response->json('login_url'))->toContain('/auth/handoff?');

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

    // Nobody is logged in here: this host is the sign-up host, and the owner
    // works on their workspace's own (LoginHandoffTest follows the link).
    $this->assertGuest();

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

it('regenerates the session id on signup to prevent session fixation', function (): void {
    // Establish a session before signup so we have a pre-signup session ID to compare.
    // /health is a landlord route that goes through the web middleware group (StartSession)
    // but skips NeedsTenant, so it reliably starts a session in any test context.
    $this->get('/health');
    $preSignupId = session()->getId();

    $this->postJson('/workspaces', [
        'workspace_name' => 'Beta Corp',
        'slug'           => 'beta',
        'name'           => 'Dave',
        'email'          => 'dave@example.com',
        'password'       => 'password123',
    ])->assertStatus(201);

    // The session ID must be rotated so a planted (pre-signup) session ID cannot
    // survive authentication (session fixation defence).
    expect(session()->getId())->not->toBe($preSignupId);
});
