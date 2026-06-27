<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

// ---------------------------------------------------------------------------
// 1. Freshly signed-up owner has email_verified_at = null
// ---------------------------------------------------------------------------

it('a newly signed-up owner has email_verified_at null', function (): void {
    Notification::fake();

    $response = $this->postJson('/workspaces', [
        'workspace_name' => 'Acme Corp',
        'slug'           => 'acme-verify',
        'name'           => 'Alice',
        'email'          => 'alice@example.com',
        'password'       => 'password123',
    ]);

    $response->assertStatus(201);

    $workspace = Workspace::where('slug', 'acme-verify')->firstOrFail();
    $workspace->makeCurrent();
    $user = User::where('email', 'alice@example.com')->firstOrFail();
    Workspace::forgetCurrent();

    expect($user->email_verified_at)->toBeNull();
});

// ---------------------------------------------------------------------------
// 2. Signed verify URL sets email_verified_at
// ---------------------------------------------------------------------------

it('hitting a valid signed verify URL sets email_verified_at', function (): void {
    $workspace = Workspace::factory()->create();
    $workspace->makeCurrent();
    $user = User::factory()->for($workspace, 'workspace')->create([
        'email_verified_at' => null,
    ]);
    Workspace::forgetCurrent();

    $url = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)]
    );

    $response = $this->getJson($url);
    $response->assertStatus(200);

    $user->refresh();
    expect($user->email_verified_at)->not->toBeNull();
});

// ---------------------------------------------------------------------------
// 3. Idempotent: already-verified stays verified
// ---------------------------------------------------------------------------

it('verifying an already-verified user is idempotent', function (): void {
    $workspace = Workspace::factory()->create();
    $workspace->makeCurrent();
    $user = User::factory()->for($workspace, 'workspace')->create([
        'email_verified_at' => now()->subDay(),
    ]);
    Workspace::forgetCurrent();

    $url = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)]
    );

    $response = $this->getJson($url);
    $response->assertStatus(200);

    $user->refresh();
    expect($user->email_verified_at)->not->toBeNull();
});

// ---------------------------------------------------------------------------
// 4. Invalid / forged signature → 403
// ---------------------------------------------------------------------------

it('an unsigned (forged) verify URL returns 403', function (): void {
    $workspace = Workspace::factory()->create();
    $workspace->makeCurrent();
    $user = User::factory()->for($workspace, 'workspace')->create(['email_verified_at' => null]);
    Workspace::forgetCurrent();

    // Build URL without signing — just the raw path
    $response = $this->getJson("/verify-email/{$user->id}/" . sha1($user->email));
    $response->assertStatus(403);
});

// ---------------------------------------------------------------------------
// 5. Wrong hash → 403 (valid signature, wrong hash)
// ---------------------------------------------------------------------------

it('a signed verify URL with a wrong hash returns 403', function (): void {
    $workspace = Workspace::factory()->create();
    $workspace->makeCurrent();
    $user = User::factory()->for($workspace, 'workspace')->create(['email_verified_at' => null]);
    Workspace::forgetCurrent();

    $url = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1('wrong@example.com')]
    );

    $response = $this->getJson($url);
    $response->assertStatus(403);

    $user->refresh();
    expect($user->email_verified_at)->toBeNull();
});

// ---------------------------------------------------------------------------
// 6. Resend dispatches a VerifyEmail notification
// ---------------------------------------------------------------------------

it('resend dispatches a VerifyEmail notification for an unverified user', function (): void {
    Notification::fake();

    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);
    $user = User::factory()->for($workspace, 'workspace')->create([
        'email_verified_at' => null,
    ]);

    $response = $this->actingAs($user)->postJson('/email/verification-notification');
    $response->assertStatus(200);

    Notification::assertSentTo($user, VerifyEmail::class);

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 7. Verified gate — unverified user is blocked with 403
// ---------------------------------------------------------------------------

it('the verified gate blocks an authenticated but unverified user with 403', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);
    $user = User::factory()->for($workspace, 'workspace')->create([
        'email_verified_at' => null,
    ]);

    $response = $this->actingAs($user)->getJson('/test-verified-gate');
    $response->assertStatus(403);

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 8. Verified gate — verified user passes
// ---------------------------------------------------------------------------

it('the verified gate allows an authenticated and verified user', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);
    $user = User::factory()->for($workspace, 'workspace')->create([
        'email_verified_at' => now(),
    ]);

    $response = $this->actingAs($user)->getJson('/test-verified-gate');
    $response->assertStatus(200);

    Workspace::forgetCurrent();
});
