<?php

declare(strict_types=1);

use App\Models\PersonalAccessToken;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

// ---------------------------------------------------------------------------
// 1. Token creation: plaintext once, only hash stored
// ---------------------------------------------------------------------------
it('issues a plaintext token and stores only the sha256 hash', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);
    $user = User::factory()->for($workspace, 'workspace')->create();

    $response = $this->actingAs($user)->postJson('/v1/auth/tokens', ['name' => 'my-token']);

    $response->assertStatus(201);
    $plain = $response->json('token');
    expect($plain)->not->toBeNull()->and($plain)->toBeString();

    $stored = PersonalAccessToken::where('user_id', $user->id)->first();
    expect($stored)->not->toBeNull();
    expect($stored->name)->toBe('my-token');

    // The stored hash must NOT be the plaintext
    expect($stored->token_hash)->not->toBe($plain);

    // But the stored hash must be the sha256 of the plaintext
    expect($stored->token_hash)->toBe(hash('sha256', $plain));

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 2. Bearer auth on /v1/me: authenticated + last_used_at updated
// ---------------------------------------------------------------------------
it('authenticates via Bearer token on GET /v1/me and updates last_used_at', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);
    $user = User::factory()->for($workspace, 'workspace')->create();

    // Create a token via the management endpoint (session auth)
    $createResponse = $this->actingAs($user)->postJson('/v1/auth/tokens', ['name' => 'api-key']);
    $createResponse->assertStatus(201);
    $plain = $createResponse->json('token');

    // Reset any session auth guard state so the next request truly relies on Bearer
    $this->app['auth']->forgetGuards();

    // Use Bearer token to hit /v1/me
    $meResponse = $this->withToken($plain)->getJson('/v1/me');
    $meResponse->assertStatus(200);

    // Response contains the user's id
    expect($meResponse->json('id'))->toBe($user->id);

    // last_used_at was updated
    $stored = PersonalAccessToken::where('user_id', $user->id)->first();
    expect($stored->last_used_at)->not->toBeNull();

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 3. Cross-workspace: token for A, used against B → 401
// ---------------------------------------------------------------------------
it('rejects a Bearer token whose user belongs to a different workspace', function (): void {
    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();

    // Create user A and a token in workspace A
    $this->actingInWorkspace($workspaceA);
    $userA = User::factory()->for($workspaceA, 'workspace')->create();
    $createResponse = $this->actingAs($userA)->postJson('/v1/auth/tokens', ['name' => 'token-a']);
    $createResponse->assertStatus(201);
    $plain = $createResponse->json('token');

    // Reset guard state
    $this->app['auth']->forgetGuards();

    // Switch to workspace B and try the token there
    $this->actingInWorkspace($workspaceB);
    $meResponse = $this->withToken($plain)->getJson('/v1/me');

    // Must be rejected (user A is not in workspace B)
    $meResponse->assertStatus(401);

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 4a. Expired token → 401
// ---------------------------------------------------------------------------
it('rejects an expired Bearer token with 401', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);
    $user = User::factory()->for($workspace, 'workspace')->create();

    $plain = Str::random(40);

    // Insert an already-expired token directly
    PersonalAccessToken::create([
        'id'         => (string) Str::uuid(),
        'user_id'    => $user->id,
        'name'       => 'expired-key',
        'token_hash' => hash('sha256', $plain),
        'expires_at' => now()->subHour(),
    ]);

    $this->app['auth']->forgetGuards();

    $meResponse = $this->withToken($plain)->getJson('/v1/me');
    $meResponse->assertStatus(401);

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 4b. Unknown / garbage token → 401
// ---------------------------------------------------------------------------
it('rejects a garbage Bearer token with 401', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);

    $meResponse = $this->withToken('totally-made-up-garbage-token')->getJson('/v1/me');
    $meResponse->assertStatus(401);

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 5. Revoke then 401
// ---------------------------------------------------------------------------
it('revokes a token via DELETE and subsequent Bearer use returns 401', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);
    $user = User::factory()->for($workspace, 'workspace')->create();

    // Create token
    $createResponse = $this->actingAs($user)->postJson('/v1/auth/tokens', ['name' => 'revocable']);
    $createResponse->assertStatus(201);
    $tokenId = $createResponse->json('id');
    $plain    = $createResponse->json('token');

    // Revoke it
    $revokeResponse = $this->actingAs($user)->deleteJson("/v1/auth/tokens/{$tokenId}");
    $revokeResponse->assertStatus(200);

    // Reset guard state and try to use the revoked token
    $this->app['auth']->forgetGuards();
    $meResponse = $this->withToken($plain)->getJson('/v1/me');
    $meResponse->assertStatus(401);

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// 6. List tokens: no plaintext exposed
// ---------------------------------------------------------------------------
it('lists the current user\'s tokens without exposing token_hash or plaintext', function (): void {
    $workspace = Workspace::factory()->create();
    $this->actingInWorkspace($workspace);
    $user = User::factory()->for($workspace, 'workspace')->create();

    $this->actingAs($user)->postJson('/v1/auth/tokens', ['name' => 'first'])->assertStatus(201);
    $this->actingAs($user)->postJson('/v1/auth/tokens', ['name' => 'second'])->assertStatus(201);

    $response = $this->actingAs($user)->getJson('/v1/auth/tokens');
    $response->assertStatus(200);

    $tokens = $response->json();
    expect($tokens)->toHaveCount(2);

    foreach ($tokens as $token) {
        // Must never expose the raw hash or a plaintext key
        expect($token)->not->toHaveKey('token_hash');
        expect($token)->not->toHaveKey('token');
        // Must have the name
        expect($token)->toHaveKey('name');
        expect($token)->toHaveKey('id');
    }

    Workspace::forgetCurrent();
});
