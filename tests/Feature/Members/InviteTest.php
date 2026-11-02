<?php

declare(strict_types=1);

use App\Models\Invitation;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\WorkspaceInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
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

// ---------------------------------------------------------------------------
// 11. Invitation to a deleted workspace → fails like an unknown token
// ---------------------------------------------------------------------------
it('accepting an invitation to a deleted workspace fails with 422', function (): void {
    $workspace = Workspace::factory()->create();
    $workspace->makeCurrent();
    $owner = User::factory()->for($workspace, 'workspace')->create([
        'admin_level'       => 'owner',
        'email_verified_at' => now(),
    ]);

    $rawToken = Str::random(40);
    Invitation::forceCreate([
        'id'           => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'email'        => 'too-late@example.com',
        'admin_level'  => 'member',
        'is_developer' => true,
        'is_agent'     => false,
        'token_hash'   => hash('sha256', $rawToken),
        'invited_by'   => $owner->id,
        'expires_at'   => now()->addDay(),
    ]);
    Workspace::forgetCurrent();
    // Closed, as DeleteWorkspace leaves it until the queued erasing runs.
    $workspace->delete();

    $this->postJson("/invitations/{$rawToken}/accept", [
        'name'     => 'Too Late',
        'password' => 'password123',
    ])->assertStatus(422)->assertJsonPath('errors.token.0', 'The invitation token is invalid.');

    $this->assertDatabaseMissing('users', ['email' => 'too-late@example.com']);
});

// ---------------------------------------------------------------------------
// The invitation email
// ---------------------------------------------------------------------------
/** The role an invitation offers. Never saved: the email only reads it. */
function invitationEmailRole(array $role = []): Invitation
{
    return new Invitation(['admin_level' => 'member', 'is_developer' => true, 'is_agent' => true, ...$role]);
}

/** The invitation email for this role. */
function invitationEmail(
    Workspace $workspace,
    array $role = [],
    string $inviter = 'Marta Rossi',
    string $link = 'https://acme.prizy.test/invitations/token/accept',
): MailMessage {
    return (new WorkspaceInvitation($link, $inviter, $workspace, invitationEmailRole($role)))
        ->toMail(new AnonymousNotifiable());
}

/** @return array{string, string} The HTML and plain-text parts. */
function invitationEmailParts(MailMessage $mail): array
{
    return [(string) $mail->render(), view($mail->view[1], $mail->data())->render()];
}

it('the invitation email names who invited them and the workspace', function (): void {
    Notification::fake();
    config(['app.url' => 'https://prizy.test', 'app.base_domain' => 'prizy.test']);

    $workspace = Workspace::factory()->create(['name' => 'Acme Corp', 'slug' => 'acme']);
    $this->actingInWorkspace($workspace);
    $owner = User::factory()->for($workspace, 'workspace')->create([
        'name'              => 'Marta Rossi',
        'admin_level'       => 'owner',
        'email_verified_at' => now(),
    ]);

    // The link follows the host the invitation was sent from.
    URL::forceRootUrl('https://acme.prizy.test');

    $this->actingAs($owner)->postJson('/invitations', [
        'email'        => 'dev@example.com',
        'admin_level'  => 'member',
        'is_developer' => true,
    ])->assertStatus(201);

    $html = null;
    $link = null;
    Notification::assertSentOnDemand(WorkspaceInvitation::class, function (WorkspaceInvitation $n) use (&$html, &$link): bool {
        $html = (string) $n->toMail(new AnonymousNotifiable())->render();
        $link = $n->getAcceptUrl();

        return true;
    });

    expect($html)->toContain('Come build with')
        ->and($html)->toContain('<strong style="color:#1d1a14;">Marta Rossi</strong> invited you to join')
        ->and($html)->toContain('Acme Corp')
        ->and($html)->toContain('href="https://acme.prizy.test"')
        ->and($html)->toContain('>acme.prizy.test</a>')
        ->and($html)->toContain('href="'.e($link).'"')
        ->and($html)->toContain('expires in <strong style="color:#1d1a14;">72 hours</strong>');

    Workspace::forgetCurrent();
});

it('the invitation email links to the workspace on the app\'s own scheme and port', function (): void {
    config(['app.url' => 'http://prizy.test:8001', 'app.base_domain' => 'prizy.test']);
    $workspace = Workspace::factory()->create(['slug' => 'acme']);

    [$html] = invitationEmailParts(invitationEmail($workspace, link: 'http://acme.prizy.test:8001/invitations/token/accept'));

    expect($html)->toContain('href="http://acme.prizy.test:8001"')
        ->and($html)->toContain('>acme.prizy.test</a>');
});

it('the invitation email\'s plain-text part keeps the names and the link unescaped', function (): void {
    $workspace = Workspace::factory()->create(['name' => 'Acme & Co', 'slug' => 'acme']);
    $link = 'https://acme.prizy.test/invitations/token/accept?a=1&b=2';

    [$html, $text] = invitationEmailParts(invitationEmail($workspace, inviter: 'Marta & Luca', link: $link));

    expect($html)->toContain('Acme &amp; Co')
        ->and($html)->toContain('Marta &amp; Luca')
        ->and($text)->toContain('Acme & Co')
        ->and($text)->toContain('Marta & Luca')
        ->and($text)->toContain($link)
        ->and($text)->toContain('expires in 72 hours');
});

it('the invitation only promises what the invitee will have', function (array $modules, array $role, array $says, array $neverSays): void {
    $workspace = Workspace::factory()->create($modules)->refresh();

    foreach (invitationEmailParts(invitationEmail($workspace, $role)) as $part) {
        foreach ($says as $line) {
            expect($part)->toContain($line);
        }
        foreach ($neverSays as $line) {
            expect($part)->not->toContain($line);
        }
    }
})->with([
    'a developer and agent, both modules' => [
        [],
        ['is_developer' => true, 'is_agent' => true],
        ['side by side', 'Set your name and password', 'Check Today', 'for your issues, and Support for your tickets.', 'Mention teammates', 'with @, and link issues with # in your to-dos.'],
        ['issues and tickets assigned'],
    ],
    'a developer, both modules' => [
        [],
        ['is_developer' => true, 'is_agent' => false],
        ['side by side', 'Check Today', 'for the issues assigned to you.', 'Mention teammates'],
        ['Open Support', 'your tickets'],
    ],
    'an agent, both modules' => [
        [],
        ['is_developer' => false, 'is_agent' => true],
        ['side by side', 'Open Support', 'for the tickets assigned to you.'],
        ['Check Today', 'Mention teammates'],
    ],
    'an agent, support only' => [
        ['tracker_enabled' => false],
        ['is_developer' => false, 'is_agent' => true],
        ['where your team answers its support tickets.', 'Open Support'],
        ['engineering issues', 'Check Today', 'Mention teammates'],
    ],
    'a developer, tracker only' => [
        ['helpdesk_enabled' => false],
        ['is_developer' => true, 'is_agent' => false],
        ['where your team tracks its engineering issues.', 'Check Today', 'Mention teammates'],
        ['support tickets', 'Open Support'],
    ],
    'a developer and agent, support only' => [
        ['tracker_enabled' => false],
        ['is_developer' => true, 'is_agent' => true],
        ['Open Support'],
        ['Check Today', 'Mention teammates'],
    ],
    'a developer and agent, tracker only' => [
        ['helpdesk_enabled' => false],
        ['is_developer' => true, 'is_agent' => true],
        ['Check Today', 'for the issues assigned to you.'],
        ['Open Support', 'your tickets'],
    ],
    'a viewer' => [
        [],
        ['admin_level' => 'viewer', 'is_developer' => true, 'is_agent' => true],
        ['Have a look around', 'your access is read-only.'],
        ['Check Today', 'Open Support', 'Mention teammates'],
    ],
    'an admin with no module of their own' => [
        [],
        ['admin_level' => 'admin', 'is_developer' => false, 'is_agent' => false],
        ['Open Settings', 'to look after the workspace.'],
        ['Check Today', 'Open Support', 'Mention teammates'],
    ],
]);

it('the invitation numbers the steps it keeps with no gaps', function (): void {
    $workspace = Workspace::factory()->create()->refresh();

    [$html, $text] = invitationEmailParts(invitationEmail($workspace, ['is_developer' => false, 'is_agent' => true]));

    expect($text)->toContain('1. Set your name and password')
        ->and($text)->toContain('2. Open Support')
        ->and($text)->not->toContain('3. ')
        ->and($html)->toContain('>2</td>')
        ->and($html)->not->toContain('>3</td>');
});

it('a line break in a name does not reach the plain-text email', function (string $break): void {
    $workspace = Workspace::factory()->create(['name' => "Acme{$break}Visit evil.example"]);
    $inviter = "Bob{$break}{$break}Accept invitation:{$break}https://evil.example/x{$break}";

    [, $text] = invitationEmailParts(invitationEmail($workspace, inviter: $inviter));
    $lines = array_map(trim(...), explode("\n", $text));

    expect($lines)->not->toContain('https://evil.example/x')
        ->and(array_count_values($lines)['Accept invitation:'])->toBe(1)
        ->and($text)->toContain('Bob Accept invitation: https://evil.example/x invited you')
        ->and($text)->toContain('Your workspace: Acme Visit evil.example (');
})->with([
    'line feed'           => ["\n"],
    'carriage return'     => ["\r\n"],
    'vertical tab'        => ["\x0B"],
    'next line'           => ["\u{85}"],
    'line separator'      => ["\u{2028}"],
    'paragraph separator' => ["\u{2029}"],
]);

it('the invitation states the window the row is really given', function (): void {
    Notification::fake();
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);
    $owner = User::factory()->for($workspace, 'workspace')->create([
        'admin_level'       => 'owner',
        'email_verified_at' => now(),
    ]);

    $this->actingAs($owner)->postJson('/invitations', [
        'email'        => 'dev@example.com',
        'admin_level'  => 'member',
        'is_developer' => true,
    ])->assertCreated();

    $minutes = now()->diffInMinutes(Invitation::query()->sole()->expires_at);

    expect(abs($minutes - Invitation::EXPIRES_IN_HOURS * 60))->toBeLessThan(1.0)
        ->and(invitationEmail($workspace)->viewData['expiresInHours'])->toBe(Invitation::EXPIRES_IN_HOURS);

    Workspace::forgetCurrent();
});

it('the invitation button says what the notification says', function (): void {
    $mail = invitationEmail(Workspace::factory()->create());
    $data = [...$mail->data(), 'actionText' => 'Join them'];

    expect(view($mail->view[0], $data)->render())->toContain('Join them &rarr;')
        ->and(view($mail->view[0], $data)->render())->not->toContain('Accept invitation')
        ->and(view($mail->view[1], $data)->render())->toContain('Join them:');
});

it('the Prizy team only signs an invitation sent from the Prizy cloud', function (): void {
    config(['app.url' => 'https://signup.prizy.dev', 'app.base_domain' => 'prizy.dev']);

    [$html, $text] = invitationEmailParts(invitationEmail(Workspace::factory()->create(['slug' => 'acme'])));

    expect($html)->toContain('The Prizy team')
        ->and($html)->toContain('href="https://prizy.dev"')
        ->and($html)->toContain('href="https://docs.prizy.dev"')
        ->and($html)->not->toContain('help.prizy.dev')
        ->and($text)->toContain('The Prizy team');
});

it('a self-hosted invitation points at its own install, not at the Prizy cloud', function (): void {
    config(['app.url' => 'https://prizy.test', 'app.base_domain' => 'prizy.test']);

    [$html, $text] = invitationEmailParts(invitationEmail(Workspace::factory()->create(['slug' => 'acme'])));

    expect($html)->not->toContain('The Prizy team')
        ->and($html)->not->toContain('prizy.dev')
        ->and($html)->toContain('See you inside.')
        ->and($html)->toContain('Sent from')
        ->and($text)->not->toContain('The Prizy team')
        ->and($text)->toContain('See you inside.');
});

it('the invitation names the host its link goes to', function (): void {
    config(['app.url' => 'https://prizy.test', 'app.base_domain' => 'prizy.test']);
    $workspace = Workspace::factory()->create(['slug' => 'acme', 'custom_domain' => 'support.acme.example']);

    [$html, $text] = invitationEmailParts(invitationEmail($workspace, link: 'https://support.acme.example/invitations/token/accept'));

    expect($html)->toContain('href="https://support.acme.example"')
        ->and($html)->toContain('>support.acme.example</a>')
        ->and($html)->not->toContain('acme.prizy.test')
        ->and($text)->toContain('(support.acme.example)');
});

it('a long name wraps instead of widening the email', function (): void {
    [$html] = invitationEmailParts(invitationEmail(Workspace::factory()->create(['name' => 'Acme Corp'])));

    expect($html)->toMatch('/overflow-wrap:anywhere[^>]*>\s*<strong[^>]*>Marta Rossi/')
        ->and($html)->toMatch('/overflow-wrap:anywhere[^>]*>\s*Acme Corp\s*</');
});

it('the workspace tile shows one whole character', function (string $name, string $initial): void {
    $mail = invitationEmail(Workspace::factory()->create(['name' => $name]));

    expect($mail->viewData['workspaceInitial'])->toBe($initial)
        ->and((string) $mail->render())->toContain(">{$initial}</td>");
})->with([
    'a letter'         => ['acme', 'A'],
    'a sharp s'        => ['ßeta', 'ß'],
    'a flag'           => ["\u{1F1EE}\u{1F1F9} Italia", "\u{1F1EE}\u{1F1F9}"],
    'a joined emoji'   => ["\u{1F469}\u{200D}\u{1F4BB} Devs", "\u{1F469}\u{200D}\u{1F4BB}"],
    'a combining mark' => ["e\u{301}lan", "E\u{301}"],
]);

it('the invitation leaves through the mailer with an HTML and a plain-text part', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);
    $owner = User::factory()->for($workspace, 'workspace')->create([
        'admin_level'       => 'owner',
        'email_verified_at' => now(),
    ]);

    $this->actingAs($owner)->postJson('/invitations', [
        'email'        => 'dev@example.com',
        'admin_level'  => 'member',
        'is_developer' => true,
    ])->assertCreated();

    $sent = Mail::getSymfonyTransport()->messages();
    expect($sent)->toHaveCount(1);

    $message = $sent->first()->getOriginalMessage();
    expect($message->getTo()[0]->getAddress())->toBe('dev@example.com')
        ->and($message->getHtmlBody())->toContain('Accept invitation')
        ->and($message->getTextBody())->toContain('Accept invitation:');
});
