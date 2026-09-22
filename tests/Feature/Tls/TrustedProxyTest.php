<?php

declare(strict_types=1);

use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// The Host header selects the tenant in this application, so X-Forwarded-Host
// is a tenant-selection primitive. It must be honoured from the edge and
// ignored from anywhere else.

it('ignores a forwarded host from an untrusted client', function (): void {
    Workspace::factory()->create(['slug' => 'alpha']);

    // Real host is a workspace that does not exist; the forged header names one
    // that does. From an untrusted address the header must not be believed, so
    // no tenant resolves.
    $response = $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.5'])
        ->withHeaders(['X-Forwarded-Host' => 'alpha.localhost'])
        ->get('http://ghost.localhost/login');

    expect($response->status())->not->toBe(200);
});

it('never lets a forwarded host select a tenant, even from the edge', function (): void {
    Workspace::factory()->create(['slug' => 'alpha']);

    // Stronger than "untrusted senders are ignored": in this application a
    // forwarded host can NEVER select a tenant, whatever the proxy is trusted.
    // Spatie resolves the tenant in Multitenancy::configureRequests(), called
    // from the service provider's boot — strictly before any middleware, so
    // TrustProxies has not run and the raw Host header is what gets matched.
    //
    // This pins that property. If a future upgrade moves tenant resolution into
    // middleware, this test fails and tells us that trusting the edge has
    // quietly become a tenant-selection surface.
    $response = $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
        ->withHeaders(['X-Forwarded-Host' => 'alpha.localhost'])
        ->get('http://ghost.localhost/login');

    expect($response->status())->not->toBe(200);
});

it('honours the forwarded protocol from the edge', function (): void {
    Workspace::factory()->create(['slug' => 'alpha']);

    $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
        ->withHeaders(['X-Forwarded-Proto' => 'https'])
        ->get('http://alpha.localhost/login');

    // Without this, every signed URL and magic link generated behind TLS would
    // carry an http:// scheme.
    expect(url('/login'))->toStartWith('https://');
});
