<?php

declare(strict_types=1);

use App\Models\Workspace;
use App\Multitenancy\WorkspaceTenantFinder;
use App\Services\SignupHost;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

uses(RefreshDatabase::class);

// Sign-up and "find your workspace" live on one host with no workspace:
// APP_SIGNUP_HOST on the cloud (signup.prizy.dev), the base domain otherwise.
// Any host that resolves to no workspace answers with a way forward, not a 500.

beforeEach(function (): void {
    config([
        'app.url'         => 'https://prizy.test',
        'app.base_domain' => 'prizy.test',
        'app.signup_host' => 'signup.prizy.test',
    ]);
});

it('ships with no sign-up host, so it falls back to the base domain', function (): void {
    // Re-read the config file itself: beforeEach overrides the loaded value.
    config(['app.signup_host' => (require config_path('app.php'))['signup_host']]);

    expect(config('app.signup_host'))->toBeNull()
        ->and(SignupHost::host())->toBe('prizy.test')
        ->and(SignupHost::url('/signup'))->toBe('https://prizy.test/signup');
});

it('builds sign-up host URLs with the scheme and port APP_URL carries', function (): void {
    expect(SignupHost::url('/find'))->toBe('https://signup.prizy.test/find');

    config(['app.url' => 'http://localhost:8001', 'app.base_domain' => 'localhost', 'app.signup_host' => null]);
    expect(SignupHost::url('/signup'))->toBe('http://localhost:8001/signup');
});

it('never resolves the sign-up host to a workspace, even one named after it', function (): void {
    // Created before "signup" was reserved: it must not shadow the sign-up host.
    Workspace::factory()->create(['slug' => 'signup']);

    expect(app(WorkspaceTenantFinder::class)->findForRequest(Request::create('https://signup.prizy.test/')))->toBeNull();
});

it('lets Caddy issue the sign-up host a certificate', function (): void {
    $this->get('/_caddy/ask?domain=signup.prizy.test')->assertOk();
});

it('serves the sign-up page at the sign-up host root, ready for the form to post', function (): void {
    $this->get('https://signup.prizy.test/')
        ->assertOk()
        ->assertSee('id="app"', false)
        ->assertCookie('XSRF-TOKEN', null, false);
});

it('serves the sign-up page at the base domain root when there is no sign-up host', function (): void {
    config(['app.signup_host' => null]);

    $this->get('https://prizy.test/')->assertOk()->assertSee('id="app"', false);
});

it('sends any other workspace page on the sign-up host to find-your-workspace', function (): void {
    $this->get('https://signup.prizy.test/issues')->assertRedirect('https://signup.prizy.test/find');
    $this->get('https://signup.prizy.test/login')->assertRedirect('https://signup.prizy.test/find');
});

it('sends a host with no workspace behind it to find-your-workspace on the sign-up host', function (string $url): void {
    Workspace::factory()->create(['slug' => 'pending', 'activated_at' => null]);

    $this->get($url)->assertRedirect('https://signup.prizy.test/find');
})->with([
    'a mistyped address'      => 'https://acmee.prizy.test/',
    'a deep link on it'       => 'https://acmee.prizy.test/issues/123',
    'a pending workspace'     => 'https://pending.prizy.test/login',
    'the bare domain'         => 'https://prizy.test/',
]);

it('answers 404 instead of redirecting a JSON request or a form post', function (): void {
    $this->getJson('https://acmee.prizy.test/issues')->assertNotFound();
    $this->postJson('https://acmee.prizy.test/login', ['email' => 'a@b.c', 'password' => 'x'])->assertNotFound();
    $this->post('https://acmee.prizy.test/logout')->assertNotFound();
});

it('serves the sign-up and find pages on the sign-up host, telling the page where that host is', function (): void {
    $this->get('https://signup.prizy.test/signup')
        ->assertOk()
        ->assertSee('<meta name="prizy-signup-url" content="https://signup.prizy.test">', false);
    $this->get('https://signup.prizy.test/find')->assertOk()->assertSee('id="app"', false);
});
