<?php

declare(strict_types=1);

use App\Models\Invitation;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\WorkspaceInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

// ---------------------------------------------------------------------------
// 1. Verified owner invites dev@example.com as member + is_developer → 201
// ---------------------------------------------------------------------------
it('a verified owner can invite a developer and the invitation row is created', function (): void {
    Notification::fake();

    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    $owner = User::factory()->for($workspace, 'workspace')->create([
        'admin_level'      => 'owner',
        'email_verified_at' => now(),
    ]);

    $response = $this->actingAs($owner)->postJson('/invitations', [
        'email'        => 'dev@example.com',
        'admin_level'  => 'member',
        'is_developer' => true,
        'is_agent'     => false,
    ]);

    $response->assertStatus(201);

    // Invitation row exists with correct role fields
    $this->assertDatabaseHas('invitations', [
        'email'        => 'dev@example.com',
        'admin_level'  => 'member',
        'is_developer' => true,
        'is_agent'     => false,
        'invited_by'   => $owner->id,
    ]);

    // token_hash is a sha256 hex (64 chars), not the raw token
    $invitation = Invitation::where('email', 'dev@example.com')->firstOrFail();
    expect(strlen($invitation->token_hash))->toBe(64);
    expect($invitation->accepted_at)->toBeNull();

    // Notification sent to invitee's email (on-demand, not to a User model)
    Notification::assertSentOnDemand(
        WorkspaceInvitation::class,
        fn ($notification, $channels, $notifiable) => $notifiable->routes['mail'] === 'dev@example.com',
    );

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 2. Unverified inviter → 403 (verified gate)
// ---------------------------------------------------------------------------
it('an unverified owner is blocked with 403 from the verified gate', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    $owner = User::factory()->for($workspace, 'workspace')->create([
        'admin_level'      => 'owner',
        'email_verified_at' => null,
    ]);

    $response = $this->actingAs($owner)->postJson('/invitations', [
        'email'        => 'dev@example.com',
        'admin_level'  => 'member',
        'is_developer' => true,
        'is_agent'     => false,
    ]);

    $response->assertStatus(403);

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 3. Verified member (non-admin) → 403 (MemberPolicy)
// ---------------------------------------------------------------------------
it('a verified member (non-admin) is blocked with 403 from the MemberPolicy', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    $member = User::factory()->for($workspace, 'workspace')->create([
        'admin_level'      => 'member',
        'is_developer'     => true,
        'email_verified_at' => now(),
    ]);

    $response = $this->actingAs($member)->postJson('/invitations', [
        'email'        => 'dev@example.com',
        'admin_level'  => 'member',
        'is_developer' => true,
        'is_agent'     => false,
    ]);

    $response->assertStatus(403);

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 4. roles.md rule: member with no capability and not viewer → 422
// ---------------------------------------------------------------------------
it('inviting a member with no capabilities and not viewer is rejected with 422', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    $owner = User::factory()->for($workspace, 'workspace')->create([
        'admin_level'      => 'owner',
        'email_verified_at' => now(),
    ]);

    $response = $this->actingAs($owner)->postJson('/invitations', [
        'email'        => 'nobody@example.com',
        'admin_level'  => 'member',
        'is_developer' => false,
        'is_agent'     => false,
    ]);

    $response->assertStatus(422);
    $this->assertDatabaseMissing('invitations', ['email' => 'nobody@example.com']);

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 5. Accept (landlord, no tenant): creates user with assigned role, logs in
// ---------------------------------------------------------------------------
it('accepting an invitation creates a user in the workspace with the assigned role and logs them in', function (): void {
    Notification::fake();

    // Set up workspace + owner + invitation (tenant context)
    $workspace = Workspace::factory()->create();
    $workspace->makeCurrent();
    $owner = User::factory()->for($workspace, 'workspace')->create([
        'admin_level'      => 'owner',
        'email_verified_at' => now(),
    ]);

    $rawToken  = Str::random(40);
    $tokenHash = hash('sha256', $rawToken);

    Invitation::forceCreate([
        'id'           => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'email'        => 'dev@example.com',
        'admin_level'  => 'member',
        'is_developer' => true,
        'is_agent'     => false,
        'token_hash'   => $tokenHash,
        'invited_by'   => $owner->id,
        'expires_at'   => now()->addHours(72),
    ]);
    Workspace::forgetCurrent();

    // Accept via landlord route (no tenant context on client side)
    $response = $this->postJson("/invitations/{$rawToken}/accept", [
        'name'     => 'Dev User',
        'password' => 'password123',
    ]);

    $response->assertStatus(200);

    // User created in the correct workspace with the invited role
    $workspace->makeCurrent();
    $user = User::where('email', 'dev@example.com')->firstOrFail();
    Workspace::forgetCurrent();

    expect($user->workspace_id)->toBe($workspace->id);
    expect($user->is_developer)->toBeTrue();
    expect($user->is_agent)->toBeFalse();
    expect($user->admin_level)->toBe('member');

    // Invitation marked accepted
    $invitation = Invitation::withoutGlobalScopes()->where('token_hash', $tokenHash)->firstOrFail();
    expect($invitation->accepted_at)->not->toBeNull();

    // New user is logged in
    $this->assertAuthenticatedAs($user);

    // Password hash is correct (user can log in with their new password)
    expect(Hash::check('password123', $user->password_hash))->toBeTrue();
});

// ---------------------------------------------------------------------------
// 6. Double-accept: second attempt on same token fails
// ---------------------------------------------------------------------------
it('accepting the same token twice fails on the second attempt', function (): void {
    Notification::fake();

    $workspace = Workspace::factory()->create();
    $workspace->makeCurrent();
    $owner = User::factory()->for($workspace, 'workspace')->create([
        'admin_level'      => 'owner',
        'email_verified_at' => now(),
    ]);

    $rawToken = Str::random(40);
    Invitation::forceCreate([
        'id'           => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'email'        => 'dev2@example.com',
        'admin_level'  => 'member',
        'is_developer' => true,
        'is_agent'     => false,
        'token_hash'   => hash('sha256', $rawToken),
        'invited_by'   => $owner->id,
        'expires_at'   => now()->addHours(72),
    ]);
    Workspace::forgetCurrent();

    // First accept succeeds
    $this->postJson("/invitations/{$rawToken}/accept", [
        'name'     => 'Dev User',
        'password' => 'password123',
    ])->assertStatus(200);

    // Second accept fails (already accepted)
    $this->postJson("/invitations/{$rawToken}/accept", [
        'name'     => 'Dev Again',
        'password' => 'password456',
    ])->assertStatus(422);
});

// ---------------------------------------------------------------------------
// 8. Privilege escalation: inviting with admin_level=owner → 422
// ---------------------------------------------------------------------------
it('inviting with admin_level owner is rejected with 422 (privilege escalation guard)', function (): void {
    Notification::fake();

    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    $owner = User::factory()->for($workspace, 'workspace')->create([
        'admin_level'       => 'owner',
        'email_verified_at' => now(),
    ]);

    $response = $this->actingAs($owner)->postJson('/invitations', [
        'email'       => 'second-owner@example.com',
        'admin_level' => 'owner',
    ]);

    $response->assertStatus(422);
    $this->assertDatabaseMissing('invitations', ['email' => 'second-owner@example.com']);
    Notification::assertNothingSent();

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 9. Session fixation: accept-invite rotates the session id
// ---------------------------------------------------------------------------
it('accepting an invitation regenerates the session id to prevent session fixation', function (): void {
    Notification::fake();

    $workspace = Workspace::factory()->create();
    $workspace->makeCurrent();
    $owner = User::factory()->for($workspace, 'workspace')->create([
        'admin_level'      => 'owner',
        'email_verified_at' => now(),
    ]);

    $rawToken  = Str::random(40);
    $tokenHash = hash('sha256', $rawToken);

    Invitation::forceCreate([
        'id'           => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'email'        => 'session-fix@example.com',
        'admin_level'  => 'member',
        'is_developer' => true,
        'is_agent'     => false,
        'token_hash'   => $tokenHash,
        'invited_by'   => $owner->id,
        'expires_at'   => now()->addHours(72),
    ]);
    Workspace::forgetCurrent();

    // Establish a session before the accept so we have a pre-accept session ID.
    $this->get('/health');
    $preAcceptId = session()->getId();

    $this->postJson("/invitations/{$rawToken}/accept", [
        'name'     => 'Session User',
        'password' => 'password123',
    ])->assertStatus(200);

    // The session ID must be rotated after the invite is accepted (session fixation defence).
    expect(session()->getId())->not->toBe($preAcceptId);
});

// ---------------------------------------------------------------------------
// 10. Re-invite (Spec §5): second invite to same email updates pending row
// ---------------------------------------------------------------------------
it('re-inviting a pending email updates the existing row and resends the notification', function (): void {
    Notification::fake();

    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    $owner = User::factory()->for($workspace, 'workspace')->create([
        'admin_level'      => 'owner',
        'email_verified_at' => now(),
    ]);

    // First invite
    $this->actingAs($owner)->postJson('/invitations', [
        'email'        => 'reinvite@example.com',
        'admin_level'  => 'member',
        'is_developer' => true,
        'is_agent'     => false,
    ])->assertStatus(201);

    // Second invite to the same email (re-invite)
    $response = $this->actingAs($owner)->postJson('/invitations', [
        'email'        => 'reinvite@example.com',
        'admin_level'  => 'admin',
        'is_developer' => false,
        'is_agent'     => false,
    ]);

    $response->assertStatus(201);

    // Exactly ONE pending invitation row for this email (updated, not duplicated)
    $pendingCount = Invitation::whereNull('accepted_at')
        ->where('email', 'reinvite@example.com')
        ->count();
    expect($pendingCount)->toBe(1, 'only one pending invitation row should exist after re-invite');

    // The row was updated with the new role
    $invitation = Invitation::whereNull('accepted_at')
        ->where('email', 'reinvite@example.com')
        ->firstOrFail();
    expect($invitation->admin_level)->toBe('admin');

    // Two notifications sent (once for each invite)
    Notification::assertSentOnDemandTimes(WorkspaceInvitation::class, 2);

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 7. Expired invitation → fails
// ---------------------------------------------------------------------------
it('accepting an expired invitation fails with 422', function (): void {
    $workspace = Workspace::factory()->create();
    $workspace->makeCurrent();
    $owner = User::factory()->for($workspace, 'workspace')->create([
        'admin_level'      => 'owner',
        'email_verified_at' => now(),
    ]);

    $rawToken = Str::random(40);
    Invitation::forceCreate([
        'id'           => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'email'        => 'expired@example.com',
        'admin_level'  => 'member',
        'is_developer' => true,
        'is_agent'     => false,
        'token_hash'   => hash('sha256', $rawToken),
        'invited_by'   => $owner->id,
        'expires_at'   => now()->subHour(), // already expired
    ]);
    Workspace::forgetCurrent();

    $response = $this->postJson("/invitations/{$rawToken}/accept", [
        'name'     => 'Late User',
        'password' => 'password123',
    ]);

    $response->assertStatus(422);
    $this->assertDatabaseMissing('users', ['email' => 'expired@example.com']);
});
