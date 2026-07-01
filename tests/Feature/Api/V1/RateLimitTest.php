<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return string bearer token for a verified developer in a fresh workspace */
function throttleToken(): string
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create([
        'email_verified_at' => now(),
        'is_developer' => true,
        'admin_level' => 'member',
    ]);

    return app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];
}

it('throttles writes at 60/min with an RFC 7807 429 carrying Retry-After', function (): void {
    $token = throttleToken();

    // 60 writes are allowed through to validation (422, no rows created); throttle
    // middleware runs before validation, so each counts against the write bucket.
    for ($i = 0; $i < 60; $i++) {
        $res = $this->withToken($token)->postJson('/v1/labels', []); // invalid body → 422
        expect($res->status())->not->toBe(429);
    }

    $throttled = $this->withToken($token)->postJson('/v1/labels', []);
    $throttled->assertStatus(429);
    expect($throttled->headers->get('Content-Type'))->toContain('application/problem+json');
    expect($throttled->headers->has('Retry-After'))->toBeTrue();
    $throttled->assertJson(['status' => 429]);
    expect($throttled->json('type'))->toContain('too-many-requests');

    Workspace::forgetCurrent();
});

it('does not cap reads at the write limit (independent buckets)', function (): void {
    $token = throttleToken();

    // 61 reads exceed the 60 write limit but stay under the 300 read limit → all 200.
    for ($i = 0; $i < 61; $i++) {
        $this->withToken($token)->getJson('/v1/labels')->assertStatus(200);
    }

    Workspace::forgetCurrent();
});
