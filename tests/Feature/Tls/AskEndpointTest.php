<?php

declare(strict_types=1);

use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// Caddy asks this endpoint before issuing a certificate. A 200 for a hostname
// nobody owns turns on-demand TLS into an open issuance proxy for anyone who
// points a DNS record at this box; a 404 for a real workspace takes that
// workspace offline. Both directions matter.

it('authorises the configured base domain', function (): void {
    config(['app.base_domain' => 'example.com']);

    $this->get('/_caddy/ask?domain=example.com')->assertOk();
});

it('authorises an existing workspace subdomain', function (): void {
    config(['app.base_domain' => 'example.com']);
    Workspace::factory()->create(['slug' => 'acme']);

    $this->get('/_caddy/ask?domain=acme.example.com')->assertOk();
});

it('authorises a matching custom domain', function (): void {
    config(['app.base_domain' => 'example.com']);
    Workspace::factory()->create(['slug' => 'acme', 'custom_domain' => 'support.acme.co']);

    $this->get('/_caddy/ask?domain=support.acme.co')->assertOk();
});

it('refuses a hostname that is not a workspace', function (): void {
    config(['app.base_domain' => 'example.com']);
    Workspace::factory()->create(['slug' => 'acme']);

    $this->get('/_caddy/ask?domain=ghost.example.com')->assertNotFound();
    $this->get('/_caddy/ask?domain=evil.test')->assertNotFound();
});

it('refuses a nested subdomain of a real workspace', function (): void {
    config(['app.base_domain' => 'example.com']);
    Workspace::factory()->create(['slug' => 'acme']);

    // WorkspaceTenantFinder strips only the base domain, so `a.acme` is looked
    // up as a slug and never matches. Issuing a certificate here would produce
    // a host the application then refuses to serve.
    $this->get('/_caddy/ask?domain=a.acme.example.com')->assertNotFound();
});

it('refuses a soft-deleted workspace', function (): void {
    config(['app.base_domain' => 'example.com']);
    $workspace = Workspace::factory()->create(['slug' => 'gone']);
    $workspace->delete();

    $this->get('/_caddy/ask?domain=gone.example.com')->assertNotFound();
});

it('refuses a missing, empty or non-string domain without erroring', function (): void {
    config(['app.base_domain' => 'example.com']);

    $this->get('/_caddy/ask')->assertNotFound();
    $this->get('/_caddy/ask?domain=')->assertNotFound();
    // An array parameter must 404, not 500 — a cast would blow up here.
    $this->get('/_caddy/ask?domain[]=a&domain[]=b')->assertNotFound();
});

it('throttles the endpoint', function (): void {
    config(['app.base_domain' => 'example.com']);

    // Its own source address, deliberately. The throttle keys on the client IP,
    // and phpunit.xml sets CACHE_STORE=array — a store that lives for the whole
    // process, not the test. Sharing the default 127.0.0.1 bucket would leave
    // this test's 61 requests counted against every later test in the run.
    $from = ['REMOTE_ADDR' => '198.51.100.7'];

    for ($i = 0; $i < 60; $i++) {
        $this->withServerVariables($from)->get('/_caddy/ask?domain=example.com')->assertOk();
    }

    $this->withServerVariables($from)->get('/_caddy/ask?domain=example.com')->assertStatus(429);
});

it('matches hostnames case-insensitively', function (): void {
    config(['app.base_domain' => 'example.com']);
    Workspace::factory()->create(['slug' => 'acme']);

    $this->get('/_caddy/ask?domain=ACME.Example.Com')->assertOk();
});

it('authorises a host with a port suffix', function (): void {
    config(['app.base_domain' => 'example.com']);

    // SNI carries no port, so real Caddy traffic never sends one — but
    // WorkspaceTenantFinder sees a host already stripped of it by Symfony's
    // Request::getHost(), so this endpoint must strip it too, to agree.
    $this->get('/_caddy/ask?domain='.urlencode('example.com:8443'))->assertOk();
});

it('authorises a host with a trailing dot', function (): void {
    config(['app.base_domain' => 'example.com']);
    Workspace::factory()->create(['slug' => 'acme']);

    // RFC 6066 excludes a trailing dot from SNI, so real Caddy traffic never
    // sends one — but agreement with WorkspaceTenantFinder's normalised host
    // still requires stripping it here.
    $this->get('/_caddy/ask?domain='.urlencode('acme.example.com.'))->assertOk();
});

it('refuses a host that embeds the base domain rather than ending in it', function (): void {
    config(['app.base_domain' => 'example.com']);
    Workspace::factory()->create(['slug' => 'acme']);

    // WorkspaceTenantFinder derives its slug with Str::before(), which matches
    // the FIRST occurrence of ".example.com" anywhere in the string rather
    // than an anchored suffix, so it would actually resolve this host to the
    // "acme" workspace — a pre-existing bug in the finder, out of scope here.
    // This endpoint's anchored str_ends_with() check must still refuse it, so
    // no certificate is ever issued for an attacker-controlled host like this.
    $this->get('/_caddy/ask?domain=acme.example.com.evil.test')->assertNotFound();
});
