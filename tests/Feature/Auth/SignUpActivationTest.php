<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\Multitenancy\WorkspaceTenantFinder;
use App\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

// On a public cloud anyone can sign up, so SIGNUP_REQUIRES_ACTIVATION keeps a
// new workspace pending until its owner clicks the emailed link: no tenant
// resolves on its hostname and Caddy gets no certificate for it, so a burst of
// junk sign-ups never reaches Let's Encrypt. Self-hosted installs leave it off.

beforeEach(function (): void {
    config(['app.url' => 'https://prizy.test', 'app.base_domain' => 'prizy.test']);
    Notification::fake();
});

/** Sign up from $ip (sign-up is throttled per address). */
function activationSignUp(string $slug, string $ip): TestResponse
{
    return test()->withServerVariables(['REMOTE_ADDR' => $ip])->postJson('/workspaces', [
        'workspace_name' => 'Acme Corp',
        'slug'           => $slug,
        'name'           => 'Alice',
        'email'          => "owner@{$slug}.example",
        'password'       => 'password123',
    ]);
}

function activationOwner(Workspace $workspace): User
{
    return User::withoutGlobalScopes()->where('workspace_id', $workspace->id)->firstOrFail();
}

/** The link the VerifyEmail notification sent to $user. */
function activationLink(User $user): string
{
    $link = null;
    Notification::assertSentTo($user, VerifyEmail::class, function (VerifyEmail $n) use ($user, &$link): bool {
        $link = $n->toMail($user)->actionUrl;

        return true;
    });

    return $link;
}

function activationFinds(string $host): ?Workspace
{
    return app(WorkspaceTenantFinder::class)->findForRequest(Request::create("https://{$host}/"));
}

it('ships with activation off, so a self-hosted install is unchanged', function (): void {
    expect(config('app.signup_requires_activation'))->toBeFalse();
});

it('with activation off, sign-up puts the workspace live at once and hands back a login link for it', function (): void {
    config(['app.signup_requires_activation' => false]);

    $response = activationSignUp('acme', '198.51.100.21')
        ->assertStatus(201)
        ->assertJsonPath('activation_required', false)
        ->assertJsonPath('workspace_url', 'https://acme.prizy.test');

    $workspace = Workspace::query()->where('slug', 'acme')->firstOrFail();
    expect($workspace->activated_at)->not->toBeNull()
        ->and($response->json('login_url'))->toStartWith('https://acme.prizy.test/auth/handoff?')
        ->and(activationFinds('acme.prizy.test')?->id)->toBe($workspace->id);
});

it('with activation on, sign-up leaves the workspace pending, logs nobody in and emails the link', function (): void {
    config(['app.signup_requires_activation' => true]);

    activationSignUp('acme', '198.51.100.22')
        ->assertStatus(201)
        ->assertJsonPath('activation_required', true)
        ->assertJsonPath('workspace_url', 'https://acme.prizy.test')
        ->assertJsonPath('login_url', null);

    $workspace = Workspace::query()->where('slug', 'acme')->firstOrFail();
    expect($workspace->activated_at)->toBeNull();
    $this->assertGuest();
    Notification::assertSentTo(activationOwner($workspace), VerifyEmail::class);
});

it('builds the workspace URL with the port APP_URL carries', function (): void {
    config(['app.url' => 'http://localhost:8001', 'app.base_domain' => 'localhost']);

    activationSignUp('acme', '198.51.100.23')
        ->assertStatus(201)
        ->assertJsonPath('workspace_url', 'http://acme.localhost:8001');
});

it('resolves no tenant for a pending workspace, by subdomain or by custom domain', function (): void {
    $workspace = Workspace::factory()->create(['slug' => 'acme', 'custom_domain' => 'support.acme.co', 'activated_at' => null]);

    expect(activationFinds('acme.prizy.test'))->toBeNull()
        ->and(activationFinds('support.acme.co'))->toBeNull();

    $workspace->forceFill(['activated_at' => now()])->save();

    expect(activationFinds('acme.prizy.test')?->id)->toBe($workspace->id)
        ->and(activationFinds('support.acme.co')?->id)->toBe($workspace->id);
});

it('issues no certificate for a pending workspace, by subdomain or by custom domain', function (): void {
    $workspace = Workspace::factory()->create(['slug' => 'acme', 'custom_domain' => 'support.acme.co', 'activated_at' => null]);

    $this->get('/_caddy/ask?domain=acme.prizy.test')->assertNotFound();
    $this->get('/_caddy/ask?domain=support.acme.co')->assertNotFound();

    $workspace->forceFill(['activated_at' => now()])->save();

    $this->get('/_caddy/ask?domain=acme.prizy.test')->assertOk();
    $this->get('/_caddy/ask?domain=support.acme.co')->assertOk();
});

it('the emailed link verifies the owner, activates the workspace and sends them to it', function (): void {
    config(['app.signup_requires_activation' => true]);
    activationSignUp('acme', '198.51.100.24')->assertStatus(201);
    $workspace = Workspace::query()->where('slug', 'acme')->firstOrFail();
    $owner = activationOwner($workspace);

    // The activating click signs the owner in there (LoginHandoffTest follows it).
    $location = $this->get(activationLink($owner))->assertRedirect()->headers->get('Location');

    expect($location)->toStartWith('https://acme.prizy.test/auth/handoff?')
        ->and($workspace->fresh()->activated_at)->not->toBeNull()
        ->and($owner->fresh()->email_verified_at)->not->toBeNull()
        ->and(activationFinds('acme.prizy.test')?->id)->toBe($workspace->id);
});

it('the emailed link still works after 23 hours', function (): void {
    config(['app.signup_requires_activation' => true]);
    activationSignUp('acme', '198.51.100.25')->assertStatus(201);
    $workspace = Workspace::query()->where('slug', 'acme')->firstOrFail();
    $link = activationLink(activationOwner($workspace));

    $this->travel(23)->hours();

    expect($this->get($link)->assertRedirect()->headers->get('Location'))->toStartWith('https://acme.prizy.test/auth/handoff?');
    expect($workspace->fresh()->activated_at)->not->toBeNull();
});

it('the emailed link has expired after 25 hours and the workspace stays pending', function (): void {
    config(['app.signup_requires_activation' => true]);
    activationSignUp('acme', '198.51.100.26')->assertStatus(201);
    $workspace = Workspace::query()->where('slug', 'acme')->firstOrFail();
    $link = activationLink(activationOwner($workspace));

    $this->travel(25)->hours();

    $this->get($link)->assertForbidden();
    expect($workspace->fresh()->activated_at)->toBeNull();
});

it('a member verifying does not activate a pending workspace', function (): void {
    $workspace = Workspace::factory()->create(['slug' => 'acme', 'activated_at' => null]);
    $workspace->makeCurrent();
    $member = User::factory()->for($workspace, 'workspace')->create(['admin_level' => 'member', 'email_verified_at' => null]);
    Workspace::forgetCurrent();

    $link = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $member->id, 'hash' => sha1($member->email)]);
    $this->get($link)->assertRedirect('https://acme.prizy.test/');

    expect($workspace->fresh()->activated_at)->toBeNull()
        ->and($member->fresh()->email_verified_at)->not->toBeNull();
});

it('verifying someone in a live workspace sends them to it and leaves activated_at alone', function (): void {
    $workspace = Workspace::factory()->create(['slug' => 'beta', 'activated_at' => now()->subYear()]);
    $activatedAt = $workspace->fresh()->activated_at;
    $workspace->makeCurrent();
    $user = User::factory()->for($workspace, 'workspace')->create(['email_verified_at' => null]);
    Workspace::forgetCurrent();

    $link = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $user->id, 'hash' => sha1($user->email)]);
    $this->get($link)->assertRedirect('https://beta.prizy.test/');

    expect($workspace->fresh()->activated_at->equalTo($activatedAt))->toBeTrue();
});

it('allows ten sign-ups an hour from one address, and mistakes do not count', function (): void {
    config(['app.signup_requires_activation' => true]);
    $ip = '198.51.100.27';

    // A reserved, malformed or too-short slug sends no email, so it costs
    // nothing against the hourly cap (only the per-minute attempt throttle).
    foreach (['www', 'Bad Slug', 'admin', 'xy'] as $slug) {
        activationSignUp($slug, $ip)->assertStatus(422);
    }
    $this->travel(61)->seconds();

    for ($i = 1; $i <= 10; $i++) {
        activationSignUp("burst{$i}", $ip)->assertStatus(201);
    }

    activationSignUp('burst11', $ip)->assertStatus(429);

    // The per-minute window has reset by now; the hourly cap has not.
    $this->travel(2)->minutes();
    activationSignUp('burst12', $ip)->assertStatus(429)->assertHeader('Retry-After');

    $this->travel(60)->minutes();
    activationSignUp('burst13', $ip)->assertStatus(201);
});

it('still throttles every attempt per minute, mistakes included', function (): void {
    $ip = '198.51.100.28';

    for ($i = 1; $i <= 10; $i++) {
        activationSignUp('www', $ip)->assertStatus(422);
    }

    activationSignUp('acme', $ip)->assertStatus(429);
    expect(Workspace::query()->where('slug', 'acme')->exists())->toBeFalse();
});

it('keeps a pending workspace\'s address taken', function (): void {
    Workspace::factory()->create(['slug' => 'acme', 'activated_at' => null]);

    activationSignUp('acme', '198.51.100.29')
        ->assertStatus(422)
        ->assertJsonValidationErrors(['slug' => 'taken']);
});

it('a link with the wrong hash neither verifies nor activates a pending owner', function (): void {
    config(['app.signup_requires_activation' => true]);
    activationSignUp('acme', '198.51.100.30')->assertStatus(201);
    $workspace = Workspace::query()->where('slug', 'acme')->firstOrFail();
    $owner = activationOwner($workspace);

    $link = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $owner->id, 'hash' => sha1('someone@else.example')]);
    $this->get($link)->assertForbidden();

    expect($workspace->fresh()->activated_at)->toBeNull()
        ->and($owner->fresh()->email_verified_at)->toBeNull();
});

it('with activation on, a failed verification email deletes the workspace again, freeing its address', function (): void {
    config(['app.signup_requires_activation' => true]);
    Notification::shouldReceive('send')->andThrow(new RuntimeException('SMTP is down'));

    activationSignUp('acme', '198.51.100.31')->assertStatus(500);

    // Nobody can log in to a pending workspace to ask for another link.
    expect(Workspace::withTrashed()->where('slug', 'acme')->exists())->toBeFalse()
        ->and(User::withoutGlobalScopes()->where('email', 'owner@acme.example')->exists())->toBeFalse();

    Notification::fake();
    activationSignUp('acme', '198.51.100.32')->assertStatus(201);
});

it('with activation off, a failed verification email still completes the sign-up (its owner can resend)', function (): void {
    config(['app.signup_requires_activation' => false]);
    Notification::shouldReceive('send')->andThrow(new RuntimeException('SMTP is down'));

    $response = activationSignUp('acme', '198.51.100.33')->assertStatus(201);

    expect(Workspace::query()->where('slug', 'acme')->exists())->toBeTrue()
        ->and($response->json('login_url'))->toStartWith('https://acme.prizy.test/auth/handoff?');
});

/** A user who has yet to verify their email, in a workspace of their own. */
function activationMailUser(string $adminLevel, array $workspace = []): User
{
    $workspace = Workspace::factory()->create(['slug' => 'acme', ...$workspace]);
    $workspace->makeCurrent();
    $user = User::factory()->for($workspace, 'workspace')->create(['admin_level' => $adminLevel, 'email_verified_at' => null]);
    Workspace::forgetCurrent();

    return $user;
}

it('the email gives a new owner their workspace and the link, with or without activation', function (bool $activation): void {
    config(['app.signup_requires_activation' => $activation]);
    activationSignUp('acme', '198.51.100.34')->assertStatus(201);
    $owner = activationOwner(Workspace::query()->where('slug', 'acme')->firstOrFail());

    $mail = (new VerifyEmail())->toMail($owner);
    $html = (string) $mail->render();

    expect($html)->toContain('Welcome aboard.')
        ->and($html)->toContain('Acme Corp')
        ->and($html)->toContain('href="https://acme.prizy.test"')
        ->and($html)->toContain('>acme.prizy.test</a>')
        ->and($html)->toContain('href="'.e($mail->actionUrl).'"')
        ->and($html)->toContain('expires in <strong style="color:#1d1a14;">24 hours</strong>');
})->with(['pending' => [true], 'live' => [false]]);

it('the email links to the workspace on the app\'s own scheme and port', function (): void {
    config(['app.url' => 'http://prizy.test:8001']);

    $html = (string) (new VerifyEmail())->toMail(activationMailUser('owner'))->render();

    expect($html)->toContain('href="http://acme.prizy.test:8001"')
        ->and($html)->toContain('>acme.prizy.test</a>');
});

it('the email\'s plain-text part keeps the link and the name unescaped', function (): void {
    $mail = (new VerifyEmail())->toMail(activationMailUser('owner', ['name' => 'Acme & Co']));

    $html = (string) $mail->render();
    $text = view($mail->view[1], $mail->data())->render();

    expect($mail->actionUrl)->toContain('&')
        ->and($html)->toContain('Acme &amp; Co')
        ->and($text)->toContain($mail->actionUrl)
        ->and($text)->toContain('Acme & Co')
        ->and($text)->toContain('expires in 24 hours');
});

it('the email keeps its three steps, in both parts', function (): void {
    $mail = (new VerifyEmail())->toMail(activationMailUser('owner'));
    $text = view($mail->view[1], $mail->data())->render();

    expect((string) $mail->render())->toContain('Connect your inbox')
        ->and((string) $mail->render())->toContain('Invite your team')
        ->and((string) $mail->render())->toContain('Escalate your first ticket')
        ->and($text)->toContain('1. Connect your inbox')
        ->and($text)->toContain('2. Invite your team')
        ->and($text)->toContain('3. Escalate your first ticket');
});

it('the email\'s button says what the notification says', function (): void {
    $mail = (new VerifyEmail())->toMail(activationMailUser('owner'));
    $data = [...$mail->data(), 'actionText' => 'Confirm it'];

    expect(view($mail->view[0], $data)->render())->toContain('Confirm it &rarr;')
        ->and(view($mail->view[0], $data)->render())->not->toContain('Verify my email')
        ->and(view($mail->view[1], $data)->render())->toContain('Confirm it:');
});

it('a line break in the workspace name does not reach the plain-text part', function (): void {
    $mail = (new VerifyEmail())->toMail(activationMailUser('owner', ['name' => "Acme\nVisit evil.example"]));

    expect(view($mail->view[1], $mail->data())->render())->toContain('Your workspace: Acme Visit evil.example (');
});

it('the Prizy team only signs the email on the Prizy cloud', function (): void {
    config(['app.url' => 'https://signup.prizy.dev', 'app.base_domain' => 'prizy.dev']);

    $mail = (new VerifyEmail())->toMail(activationMailUser('owner'));
    $html = (string) $mail->render();

    expect($html)->toContain('The Prizy team')
        ->and($html)->toContain('href="https://docs.prizy.dev"')
        ->and($html)->not->toContain('help.prizy.dev')
        ->and(view($mail->view[1], $mail->data())->render())->toContain('The Prizy team');
});

it('a self-hosted install\'s email points at the install, not at the Prizy cloud', function (): void {
    $mail = (new VerifyEmail())->toMail(activationMailUser('owner'));
    $html = (string) $mail->render();
    $text = view($mail->view[1], $mail->data())->render();

    expect($html)->not->toContain('The Prizy team')
        ->and($html)->not->toContain('prizy.dev')
        ->and($html)->toContain('Sent from')
        ->and($text)->not->toContain('The Prizy team')
        ->and($text)->toContain('See you inside.');
});

it('an invited member gets the plain email: they created no workspace, and must verify', function (): void {
    $mail = (new VerifyEmail())->toMail(activationMailUser('member'));
    $text = implode(' ', [...$mail->introLines, ...$mail->outroLines]);

    expect($mail->view)->toBeNull()
        ->and($mail->actionUrl)->not->toBeNull()
        ->and($text)->toContain('Please verify your email address')
        ->and($text)->toContain('expires in 24 hours');
});
