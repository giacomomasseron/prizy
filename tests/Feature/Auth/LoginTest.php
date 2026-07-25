<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('logs in with correct credentials and updates last_seen_at', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    $user = User::factory()->for($workspace, 'workspace')->create([
        'email'         => 'alice@example.com',
        'password_hash' => Hash::make('secret-123'),
    ]);

    expect($user->last_seen_at)->toBeNull();

    $response = $this->postJson('/login', [
        'email'    => 'alice@example.com',
        'password' => 'secret-123',
    ]);

    $response->assertStatus(200);
    $this->assertTrue(auth()->check());

    $user->refresh();
    expect($user->last_seen_at)->not->toBeNull();

    Workspace::forgetCurrent();
});

it('rejects wrong password with 422 and does not authenticate', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    User::factory()->for($workspace, 'workspace')->create([
        'email'         => 'alice@example.com',
        'password_hash' => Hash::make('secret-123'),
    ]);

    $response = $this->postJson('/login', [
        'email'    => 'alice@example.com',
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(422);
    $this->assertFalse(auth()->check());

    Workspace::forgetCurrent();
});

it('cannot log into workspace A with credentials belonging to workspace B (cross-workspace isolation)', function (): void {
    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();

    // Create dup@example.com only in workspace B
    $workspaceB->makeCurrent();
    User::factory()->for($workspaceB, 'workspace')->create([
        'email'         => 'dup@example.com',
        'password_hash' => Hash::make('secret-b'),
    ]);
    Workspace::forgetCurrent();

    // Attempt login at workspace A — WorkspaceScope hides workspace B's user
    $this->actingInWorkspace($workspaceA);

    $response = $this->postJson('/login', [
        'email'    => 'dup@example.com',
        'password' => 'secret-b',
    ]);

    $response->assertStatus(422);
    $this->assertFalse(auth()->check());

    Workspace::forgetCurrent();
});

it('regenerates the session id on login to prevent session fixation', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    User::factory()->for($workspace, 'workspace')->create([
        'email'         => 'alice@example.com',
        'password_hash' => Hash::make('secret-123'),
    ]);

    // Establish a session before login to capture a pre-login session ID.
    // The /health route goes through the web middleware group (StartSession) but
    // skips NeedsTenant, so it reliably starts a session in any test context.
    $this->get('/health');
    $preLoginId = session()->getId();

    $this->postJson('/login', [
        'email'    => 'alice@example.com',
        'password' => 'secret-123',
    ])->assertStatus(200);

    // The session ID must be rotated so a planted (pre-login) session ID cannot
    // survive authentication (session fixation defence).
    expect(session()->getId())->not->toBe($preLoginId);

    Workspace::forgetCurrent();
});

it('logout invalidates the session and clears authentication', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    User::factory()->for($workspace, 'workspace')->create([
        'email'         => 'alice@example.com',
        'password_hash' => Hash::make('secret-123'),
    ]);

    // Log in first
    $this->postJson('/login', [
        'email'    => 'alice@example.com',
        'password' => 'secret-123',
    ])->assertStatus(200);

    $this->assertTrue(auth()->check());

    // Now logout
    $this->postJson('/logout')->assertStatus(200);

    $this->assertFalse(auth()->check());

    Workspace::forgetCurrent();
});

it('serves the login shell even when the session is bound to a different (stale) tenant', function (): void {
    // Simulates a returning user whose session still carries an old workspace id
    // (e.g. the workspace was recreated with a new id). EnsureValidTenantSession
    // would otherwise 401 the very page they need to re-authenticate on.
    $stale = Workspace::factory()->create();
    $current = Workspace::factory()->create();

    $this->actingInWorkspace($current)
        ->withSession(['ensure_valid_tenant_session_tenant_id' => $stale->id])
        ->get('/login')
        ->assertStatus(200)
        ->assertSee('id="app"', false);

    Workspace::forgetCurrent();
});

it('lets a user log in even when the session is bound to a different (stale) tenant', function (): void {
    $stale = Workspace::factory()->create();
    $current = Workspace::factory()->create();
    $this->actingInWorkspace($current);

    User::factory()->for($current, 'workspace')->create([
        'email'         => 'alice@example.com',
        'password_hash' => Hash::make('secret-123'),
    ]);

    // POST /login must reach the login handler (not be blocked by the tenant-session
    // guard) so the stale session can be replaced with a fresh authenticated one.
    $response = $this->withSession(['ensure_valid_tenant_session_tenant_id' => $stale->id])
        ->postJson('/login', [
            'email'    => 'alice@example.com',
            'password' => 'secret-123',
        ]);

    $response->assertStatus(200);
    $this->assertTrue(auth()->check());

    Workspace::forgetCurrent();
});
