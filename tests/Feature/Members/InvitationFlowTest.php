<?php

declare(strict_types=1);

use App\Models\Invitation;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\VerifyEmail;
use App\Notifications\WorkspaceInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

beforeEach(function (): void {
    Notification::fake();

    $this->workspace = Workspace::factory()->create();
    $this->actingInWorkspace($this->workspace);
    $this->owner = User::factory()->for($this->workspace, 'workspace')->create([
        'admin_level'       => 'owner',
        'email_verified_at' => now(),
    ]);
});

/** POST /invitations as the given user. */
function invitationFlowInvite(User $inviter, string $email, string $adminLevel = 'member'): TestResponse
{
    return test()->actingAs($inviter)->postJson('/invitations', [
        'email'        => $email,
        'admin_level'  => $adminLevel,
        'is_developer' => $adminLevel === 'member',
        'is_agent'     => false,
    ]);
}

/** Sends a real invitation, and returns the link the invitee finds in the email. */
function invitationFlowLink(User $inviter, string $email, string $adminLevel = 'member'): string
{
    invitationFlowInvite($inviter, $email, $adminLevel)->assertCreated();

    $link = null;
    Notification::assertSentOnDemand(
        WorkspaceInvitation::class,
        function ($notification, $channels, $notifiable) use ($email, &$link): bool {
            if ($notifiable->routes['mail'] !== $email) {
                return false;
            }
            $link = $notification->getAcceptUrl();

            return true;
        },
    );

    return $link;
}

/** The invitee opens the link in their own browser: no session, no workspace yet. */
function invitationFlowAsInvitee(): void
{
    Auth::forgetGuards();
    test()->flushSession();
    Workspace::forgetCurrent();
}

/** The address the accept page reads the invitation from. */
function invitationFlowDetails(string $link): string
{
    return Str::beforeLast($link, '/accept');
}

// ---------------------------------------------------------------------------
// The link in the email
// ---------------------------------------------------------------------------
it('the link in the email opens a page', function (): void {
    $link = invitationFlowLink($this->owner, 'dev@example.com');
    invitationFlowAsInvitee();

    $this->get($link)->assertOk()->assertSee('id="app"', false);
});

it('the page can read who is invited, to which workspace and by whom', function (): void {
    $link = invitationFlowLink($this->owner, 'dev@example.com');
    invitationFlowAsInvitee();

    $this->getJson(invitationFlowDetails($link))
        ->assertOk()
        ->assertExactJson([
            'email'          => 'dev@example.com',
            'workspace_name' => $this->workspace->name,
            'inviter_name'   => $this->owner->name,
        ]);
});

it('the page still opens after the person who invited them has been removed', function (): void {
    $admin = User::factory()->for($this->workspace, 'workspace')->create([
        'admin_level'       => 'admin',
        'email_verified_at' => now(),
    ]);
    $link = invitationFlowLink($admin, 'dev@example.com');
    $admin->delete();
    invitationFlowAsInvitee();

    $this->getJson(invitationFlowDetails($link))
        ->assertOk()
        ->assertJsonPath('inviter_name', $admin->name);
});

it('following the link to the end signs the new member in', function (): void {
    $link = invitationFlowLink($this->owner, 'dev@example.com');
    invitationFlowAsInvitee();

    $this->get($link)->assertOk();
    $this->postJson($link, ['name' => 'Dev User', 'password' => 'password123'])->assertOk();

    $user = User::where('email', 'dev@example.com')->firstOrFail();
    expect($user->workspace_id)->toBe($this->workspace->id);
    $this->assertAuthenticatedAs($user);
});

it('a new member is still asked to confirm their address', function (): void {
    $link = invitationFlowLink($this->owner, 'dev@example.com');
    invitationFlowAsInvitee();

    $this->postJson($link, ['name' => 'Dev User', 'password' => 'password123'])->assertOk();

    Notification::assertSentTo(User::where('email', 'dev@example.com')->firstOrFail(), VerifyEmail::class);
});

// ---------------------------------------------------------------------------
// An invitation that can no longer be used
// ---------------------------------------------------------------------------
it('an unknown invitation says so', function (): void {
    invitationFlowAsInvitee();

    $this->getJson('/invitations/'.Str::random(40))
        ->assertUnprocessable()
        ->assertJsonPath('errors.token.0', 'The invitation token is invalid.');
});

it('an expired invitation says so', function (): void {
    $link = invitationFlowLink($this->owner, 'dev@example.com');
    Invitation::query()->update(['expires_at' => now()->subMinute()]);
    invitationFlowAsInvitee();

    $this->getJson(invitationFlowDetails($link))
        ->assertUnprocessable()
        ->assertJsonPath('errors.token.0', 'This invitation has expired.');
});

it('an invitation already accepted says so', function (): void {
    $link = invitationFlowLink($this->owner, 'dev@example.com');
    invitationFlowAsInvitee();
    $this->postJson($link, ['name' => 'Dev User', 'password' => 'password123'])->assertOk();

    invitationFlowAsInvitee();
    $this->getJson(invitationFlowDetails($link))
        ->assertUnprocessable()
        ->assertJsonPath('errors.token.0', 'This invitation has already been accepted.');
});

it('an invitation to a deleted workspace says it is invalid', function (): void {
    $link = invitationFlowLink($this->owner, 'dev@example.com');
    $this->workspace->delete();
    invitationFlowAsInvitee();

    $this->getJson(invitationFlowDetails($link))
        ->assertUnprocessable()
        ->assertJsonPath('errors.token.0', 'The invitation token is invalid.');
});

it('an invitation for someone who is a member by now points them to sign in, without a crash', function (): void {
    $link = invitationFlowLink($this->owner, 'dev@example.com');
    User::factory()->for($this->workspace, 'workspace')->create(['email' => 'dev@example.com']);
    invitationFlowAsInvitee();

    $reason = 'You are already a member of this workspace. Sign in instead.';
    $this->getJson(invitationFlowDetails($link))
        ->assertUnprocessable()
        ->assertJsonPath('errors.token.0', $reason);
    $this->postJson($link, ['name' => 'Dev User', 'password' => 'password123'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.token.0', $reason);

    expect(Invitation::withoutGlobalScopes()->firstOrFail()->accepted_at)->toBeNull();
});

// ---------------------------------------------------------------------------
// Who can be invited
// ---------------------------------------------------------------------------
it('inviting someone who is already in the workspace is refused, however they type the address', function (): void {
    User::factory()->for($this->workspace, 'workspace')->create(['email' => 'here@example.com']);

    invitationFlowInvite($this->owner, 'HERE@example.com')
        ->assertUnprocessable()
        ->assertJsonPath('errors.email.0', 'This person is already a member of this workspace.');

    expect(Invitation::count())->toBe(0);
    Notification::assertNothingSent();
});

it('an address in use in another workspace can still be invited', function (): void {
    $other = Workspace::factory()->create();
    $other->makeCurrent();
    User::factory()->for($other, 'workspace')->create(['email' => 'shared@example.com']);
    $this->workspace->makeCurrent();

    invitationFlowInvite($this->owner, 'shared@example.com')->assertCreated();
});

it('a removed member comes back as the same person, with what the new invitation says', function (): void {
    $member = User::factory()->for($this->workspace, 'workspace')->create([
        'name'              => 'Old Name',
        'email'             => 'back@example.com',
        'password_hash'     => Hash::make('old-password'),
        'admin_level'       => 'admin',
        'is_developer'      => true,
        'email_verified_at' => now(),
    ]);
    $this->actingAs($this->owner)->deleteJson("/v1/members/{$member->id}")->assertSuccessful();

    $link = invitationFlowLink($this->owner, 'back@example.com', 'viewer');
    invitationFlowAsInvitee();
    $this->get($link)->assertOk();
    $this->getJson(invitationFlowDetails($link))->assertOk();
    $this->postJson($link, ['name' => 'New Name', 'password' => 'new-password-1'])->assertOk();

    $rows = User::withTrashed()->where('email', 'back@example.com')->get();
    expect($rows)->toHaveCount(1);

    $user = $rows->first();
    expect($user->id)->toBe($member->id)
        ->and($user->trashed())->toBeFalse()
        ->and($user->name)->toBe('New Name')
        ->and($user->admin_level)->toBe('viewer')
        ->and($user->is_developer)->toBeFalse()
        ->and(Hash::check('new-password-1', $user->password_hash))->toBeTrue()
        ->and(Hash::check('old-password', $user->password_hash))->toBeFalse();

    expect(Invitation::withoutGlobalScopes()->firstOrFail()->accepted_at)->not->toBeNull();
    $this->assertAuthenticatedAs($user);
});

it('a removed member does not get their old API tokens back', function (): void {
    $member = User::factory()->for($this->workspace, 'workspace')->create(['email' => 'back@example.com']);
    $member->personalAccessTokens()->forceCreate([
        'id'         => (string) Str::uuid(),
        'name'       => 'old laptop',
        'token_hash' => hash('sha256', 'old-token'),
    ]);
    $this->actingAs($this->owner)->deleteJson("/v1/members/{$member->id}")->assertSuccessful();

    $link = invitationFlowLink($this->owner, 'back@example.com');
    invitationFlowAsInvitee();
    $this->postJson($link, ['name' => 'Back Again', 'password' => 'new-password-1'])->assertOk();

    expect(DB::table('personal_access_tokens')->where('user_id', $member->id)->count())->toBe(0);
});

it('a returning member who confirmed their address before is not asked to again', function (): void {
    $member = User::factory()->for($this->workspace, 'workspace')->create([
        'email'             => 'back@example.com',
        'email_verified_at' => now(),
    ]);
    $this->actingAs($this->owner)->deleteJson("/v1/members/{$member->id}")->assertSuccessful();

    $link = invitationFlowLink($this->owner, 'back@example.com');
    invitationFlowAsInvitee();
    $this->postJson($link, ['name' => 'Back Again', 'password' => 'new-password-1'])->assertOk();

    Notification::assertNotSentTo($member, VerifyEmail::class);
});

// ---------------------------------------------------------------------------
// How many
// ---------------------------------------------------------------------------
it('the same address can be invited only a few times an hour, however it is typed', function (): void {
    foreach (range(1, 5) as $attempt) {
        invitationFlowInvite($this->owner, 'dev@example.com')->assertCreated();
    }

    invitationFlowInvite($this->owner, 'DEV@example.com')->assertStatus(429);
    invitationFlowInvite($this->owner, 'someone-else@example.com')->assertCreated();

    $this->travel(61)->minutes();
    invitationFlowInvite($this->owner, 'dev@example.com')->assertCreated();
});

it('a workspace has a daily limit on invitations, shared by everyone in it', function (): void {
    $admin = User::factory()->for($this->workspace, 'workspace')->create([
        'admin_level'       => 'admin',
        'email_verified_at' => now(),
    ]);

    // Spending the real limiter's key directly: 200 requests would be a slow
    // test, and a wrong key would fail it, because the invitation would go out.
    RateLimiter::increment(md5("invitationsworkspace:{$this->workspace->id}"), 86400, 200);

    invitationFlowInvite($this->owner, 'one@example.com')->assertStatus(429);
    invitationFlowInvite($admin, 'two@example.com')->assertStatus(429);
    Notification::assertNothingSent();

    $this->travel(25)->hours();
    invitationFlowInvite($this->owner, 'one@example.com')->assertCreated();
});

it('another workspace has its own daily limit', function (): void {
    RateLimiter::increment(md5("invitationsworkspace:{$this->workspace->id}"), 86400, 200);

    $other = Workspace::factory()->create();
    $this->actingInWorkspace($other);
    $otherOwner = User::factory()->for($other, 'workspace')->create([
        'admin_level'       => 'owner',
        'email_verified_at' => now(),
    ]);

    invitationFlowInvite($otherOwner, 'one@example.com')->assertCreated();
});

it('where anyone can sign up, a new workspace has a smaller daily limit', function (): void {
    config(['app.signup_requires_activation' => true]);
    RateLimiter::increment(md5("invitationsworkspace:{$this->workspace->id}"), 86400, 50);

    invitationFlowInvite($this->owner, 'one@example.com')->assertStatus(429);
    Notification::assertNothingSent();
});

it('a workspace more than a week old has the full daily limit', function (): void {
    config(['app.signup_requires_activation' => true]);
    $this->workspace->forceFill(['created_at' => now()->subDays(8)])->save();
    RateLimiter::increment(md5("invitationsworkspace:{$this->workspace->id}"), 86400, 50);

    invitationFlowInvite($this->owner, 'one@example.com')->assertCreated();
});

it('where sign-up is not public, a new workspace has the full daily limit', function (): void {
    config(['app.signup_requires_activation' => false]);
    RateLimiter::increment(md5("invitationsworkspace:{$this->workspace->id}"), 86400, 50);

    invitationFlowInvite($this->owner, 'one@example.com')->assertCreated();
});

it('more workspaces buy one visitor no more invitations', function (): void {
    RateLimiter::increment(md5('invitationsip:198.51.100.7'), 86400, 300);

    $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.7']);
    invitationFlowInvite($this->owner, 'one@example.com')->assertStatus(429);

    $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.8']);
    invitationFlowInvite($this->owner, 'one@example.com')->assertCreated();
});

it('a malformed address gets a validation error, not a crash in the limiter', function (): void {
    $this->actingAs($this->owner)
        ->postJson('/invitations', ['email' => ['a', 'b'], 'admin_level' => 'member', 'is_developer' => true])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});
