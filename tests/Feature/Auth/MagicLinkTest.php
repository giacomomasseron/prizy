<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\Notifications\MagicLinkLogin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

// ---------------------------------------------------------------------------
// 1. Requesting a magic link for a known email dispatches the notification
// ---------------------------------------------------------------------------

it('requesting a magic link for a known email sends a MagicLinkLogin notification', function (): void {
    Notification::fake();

    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    $user = User::factory()->for($workspace, 'workspace')->create([
        'email' => 'alice@example.com',
    ]);

    $response = $this->postJson('/magic-link', ['email' => 'alice@example.com']);

    $response->assertStatus(202);
    Notification::assertSentTo($user, MagicLinkLogin::class);
});

// ---------------------------------------------------------------------------
// 2. Consuming the captured signed URL logs the user in and rotates session
// ---------------------------------------------------------------------------

it('consuming a valid magic-link URL signs the user in and rotates the session', function (): void {
    Notification::fake();

    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    $user = User::factory()->for($workspace, 'workspace')->create([
        'email' => 'alice@example.com',
    ]);

    $this->postJson('/magic-link', ['email' => 'alice@example.com'])
        ->assertStatus(202);

    $capturedUrl = null;

    Notification::assertSentTo(
        $user,
        MagicLinkLogin::class,
        function (MagicLinkLogin $notification) use (&$capturedUrl): bool {
            $capturedUrl = $notification->url;

            return true;
        }
    );

    $this->assertNotNull($capturedUrl, 'URL should have been captured from notification');

    // Warm up a session so we can verify the session ID rotates on login.
    $this->get('/health');
    $preLoginSessionId = session()->getId();

    // Drop workspace context — the consume route is a landlord route (no NeedsTenant).
    Workspace::forgetCurrent();

    $response = $this->getJson($capturedUrl);

    $response->assertStatus(200);
    $this->assertTrue(auth()->check(), 'User should be authenticated after consuming the link');
    expect(session()->getId())->not->toBe($preLoginSessionId);
});

// ---------------------------------------------------------------------------
// 3. The nonce is single-use: the second consume attempt fails
// ---------------------------------------------------------------------------

it('the magic-link nonce is single-use: consuming the same URL twice fails the second time', function (): void {
    Notification::fake();

    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    $user = User::factory()->for($workspace, 'workspace')->create([
        'email' => 'alice@example.com',
    ]);

    $this->postJson('/magic-link', ['email' => 'alice@example.com'])
        ->assertStatus(202);

    $capturedUrl = null;

    Notification::assertSentTo(
        $user,
        MagicLinkLogin::class,
        function (MagicLinkLogin $notification) use (&$capturedUrl): bool {
            $capturedUrl = $notification->url;

            return true;
        }
    );

    Workspace::forgetCurrent();

    // First consume succeeds.
    $this->getJson($capturedUrl)->assertStatus(200);
    $this->assertTrue(auth()->check());

    // Reset auth state for the second attempt.
    auth()->logout();
    $this->assertFalse(auth()->check());

    // Second consume must fail: nonce was already pulled from cache.
    $this->getJson($capturedUrl)->assertStatus(401);
    $this->assertFalse(auth()->check(), 'User must NOT be authenticated after second use of nonce');
});

// ---------------------------------------------------------------------------
// 4. Forged / unsigned URL returns 403 (signed middleware rejects it)
// ---------------------------------------------------------------------------

it('a forged or unsigned magic-link URL returns 403 and does not authenticate', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    $user = User::factory()->for($workspace, 'workspace')->create();

    Workspace::forgetCurrent();

    // Build URL without a valid signature (no `signature` query param).
    $forgery = '/magic-link/consume?nonce=totallyfakenonce0000000000000000000000000&user=' . $user->id;

    $response = $this->getJson($forgery);

    $response->assertStatus(403);
    $this->assertFalse(auth()->check(), 'User must NOT be authenticated after a forged URL attempt');
});

// ---------------------------------------------------------------------------
// 5. Unknown email → 202, no notification sent (no enumeration)
// ---------------------------------------------------------------------------

it('requesting a magic link for an unknown email returns 202 but sends no notification', function (): void {
    Notification::fake();

    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    $response = $this->postJson('/magic-link', ['email' => 'nobody@example.com']);

    $response->assertStatus(202);
    Notification::assertNothingSent();
});
