<?php

declare(strict_types=1);

use App\Models\Workspace;
use App\Multitenancy\WorkspaceTenantFinder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

uses(RefreshDatabase::class);

// A workspace answers on {slug}.APP_BASE_DOMAIN and on its custom domain, and
// on nothing else. Anyone can point DNS for a host of their own at this box,
// so a host that merely CONTAINS the base domain must name no workspace.

beforeEach(function (): void {
    config([
        'app.url'         => 'https://prizy.test',
        'app.base_domain' => 'prizy.test',
        'app.signup_host' => 'signup.prizy.test',
    ]);
    Workspace::factory()->create(['slug' => 'acme', 'custom_domain' => 'support.acme.co']);
});

function finderResolve(string $host): ?Workspace
{
    $workspace = app(WorkspaceTenantFinder::class)->findForRequest(Request::create("https://{$host}/"));

    return $workspace instanceof Workspace ? $workspace : null;
}

it('resolves a workspace on its own subdomain, in any letter case', function (string $host): void {
    expect(finderResolve($host)?->slug)->toBe('acme');
})->with([
    'lower case' => 'acme.prizy.test',
    'mixed case' => 'ACME.Prizy.Test',
]);

it('resolves a workspace on its custom domain', function (): void {
    expect(finderResolve('support.acme.co')?->slug)->toBe('acme');
});

it('resolves no workspace for a host that is not exactly {slug}.base', function (string $host): void {
    expect(finderResolve($host))->toBeNull();
})->with([
    'a foreign host ending in .evil.test'   => 'acme.prizy.test.evil.test',
    'a foreign domain extending the base'   => 'acme.prizy.testing',
    'a nested subdomain'                    => 'x.acme.prizy.test',
    'the bare base domain'                  => 'prizy.test',
    'an unrelated host'                     => 'acme.example.com',
]);

it('resolves no workspace by subdomain when no base domain is configured', function (): void {
    config(['app.base_domain' => null]);

    expect(finderResolve('acme.prizy.test'))->toBeNull()
        ->and(finderResolve('support.acme.co')?->slug)->toBe('acme');
});
