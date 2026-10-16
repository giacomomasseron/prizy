<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

// Sign-up happens on the sign-up host, whose session is useless: the owner
// works on acme.prizy.test. So sign-up (or, with activation on, the click that
// activates the workspace) hands over a one-time, two-minute login link on the
// workspace's own host instead of logging anyone in where they stand.

beforeEach(function (): void {
    config([
        'app.url'         => 'https://prizy.test',
        'app.base_domain' => 'prizy.test',
        'app.signup_host' => 'signup.prizy.test',
    ]);
    Notification::fake();
});

function handoffSignUp(string $slug, string $ip): TestResponse
{
    return test()->withServerVariables(['REMOTE_ADDR' => $ip])->postJson('https://signup.prizy.test/workspaces', [
        'workspace_name' => 'Acme Corp',
        'slug'           => $slug,
        'name'           => 'Alice',
        'email'          => "owner@{$slug}.example",
        'password'       => 'password123',
    ]);
}

function handoffWorkspace(string $slug): Workspace
{
    return Workspace::query()->where('slug', $slug)->firstOrFail();
}

function handoffOwner(Workspace $workspace): User
{
    return User::withoutGlobalScopes()->where('workspace_id', $workspace->id)->firstOrFail();
}

/**
 * Follow $url as the browser would on its host. Tests resolve no tenant from
 * the Host header (Spatie does that once, at boot), so make it current first.
 */
function handoffFollow(string $url, Workspace $host): TestResponse
{
    $host->makeCurrent();

    return test()->get($url);
}

/** Where a redirect went, without the trailing slash redirect('/') may drop. */
function handoffLocation(TestResponse $response): string
{
    $response->assertRedirect();

    return rtrim((string) $response->headers->get('Location'), '/');
}

function handoffVerifyLink(User $user): string
{
    $link = null;
    Notification::assertSentTo($user, VerifyEmail::class, function (VerifyEmail $n) use ($user, &$link): bool {
        $link = $n->toMail($user)->actionUrl;

        return true;
    });

    return $link;
}

it('with activation off, sign-up logs nobody in on the sign-up host and returns a login link on the workspace host', function (): void {
    $response = handoffSignUp('acme', '198.51.100.60')->assertStatus(201);

    expect($response->json('login_url'))->toStartWith('https://acme.prizy.test/auth/handoff?');
    $this->assertGuest();
});

it('the login link logs the owner in on their workspace and opens it', function (): void {
    $url = handoffSignUp('acme', '198.51.100.61')->assertStatus(201)->json('login_url');
    $workspace = handoffWorkspace('acme');

    expect(handoffLocation(handoffFollow($url, $workspace)))->toBe('https://acme.prizy.test');
    $this->assertAuthenticatedAs(handoffOwner($workspace));
});

it('the login link works once', function (): void {
    $url = handoffSignUp('acme', '198.51.100.62')->assertStatus(201)->json('login_url');
    $workspace = handoffWorkspace('acme');
    handoffFollow($url, $workspace);
    auth()->guard('web')->logout();

    expect(handoffLocation(handoffFollow($url, $workspace)))->toBe('https://acme.prizy.test/login');
    $this->assertGuest();
});

it('the login link has expired after two minutes', function (): void {
    $url = handoffSignUp('acme', '198.51.100.63')->assertStatus(201)->json('login_url');

    $this->travel(3)->minutes();

    expect(handoffLocation(handoffFollow($url, handoffWorkspace('acme'))))->toBe('https://acme.prizy.test/login');
    $this->assertGuest();
});

it('the login link logs nobody in on another workspace\'s host', function (): void {
    $url = handoffSignUp('acme', '198.51.100.64')->assertStatus(201)->json('login_url');
    $beta = Workspace::factory()->create(['slug' => 'beta']);

    $response = handoffFollow(str_replace('https://acme.', 'https://beta.', $url), $beta);

    expect(handoffLocation($response))->toBe('https://beta.prizy.test/login');
    $this->assertGuest();
});

it('a tampered login link logs nobody in', function (): void {
    $url = handoffSignUp('acme', '198.51.100.65')->assertStatus(201)->json('login_url');
    $workspace = handoffWorkspace('acme');
    $someoneElse = Workspace::factory()->create(['slug' => 'gamma']);
    $someoneElse->makeCurrent();
    $other = User::factory()->for($someoneElse, 'workspace')->create();
    Workspace::forgetCurrent();

    $tampered = preg_replace('/user=[^&]+/', 'user='.$other->id, $url);

    expect(handoffLocation(handoffFollow($tampered, $workspace)))->toBe('https://acme.prizy.test/login');
    $this->assertGuest();
});

it('a link with a bad signature logs nobody in, and does not use up the real one', function (): void {
    $url = handoffSignUp('acme', '198.51.100.68')->assertStatus(201)->json('login_url');
    $workspace = handoffWorkspace('acme');

    $forged = preg_replace('/signature=[0-9a-f]+/', 'signature='.str_repeat('0', 64), $url);
    expect($forged)->not->toBe($url);

    expect(handoffLocation(handoffFollow($forged, $workspace)))->toBe('https://acme.prizy.test/login');
    $this->assertGuest();

    expect(handoffLocation(handoffFollow($url, $workspace)))->toBe('https://acme.prizy.test');
    $this->assertAuthenticatedAs(handoffOwner($workspace));
});

it('with activation on, sign-up returns no login link', function (): void {
    config(['app.signup_requires_activation' => true]);

    handoffSignUp('acme', '198.51.100.66')->assertStatus(201)->assertJsonPath('login_url', null);
    $this->assertGuest();
});

it('the click that activates a workspace logs its owner in there; a later click only opens it', function (): void {
    config(['app.signup_requires_activation' => true]);
    handoffSignUp('acme', '198.51.100.67')->assertStatus(201);
    $workspace = handoffWorkspace('acme');
    $owner = handoffOwner($workspace);
    $verify = handoffVerifyLink($owner);

    $first = $this->get($verify);
    expect(handoffLocation($first))->toStartWith('https://acme.prizy.test/auth/handoff?');

    expect(handoffLocation(handoffFollow($first->headers->get('Location'), $workspace->fresh())))->toBe('https://acme.prizy.test');
    $this->assertAuthenticatedAs($owner);

    auth()->guard('web')->logout();
    Workspace::forgetCurrent();

    // Otherwise a 24-hour email link would work as a 24-hour password.
    $this->get($verify)->assertRedirect('https://acme.prizy.test/');
    $this->assertGuest();
});
