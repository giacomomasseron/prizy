<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

// The suite defaults to the network-free `log` broadcaster (see tests/bootstrap.php),
// but /broadcasting/auth's real channel-authorization enforcement only lives in the
// Pusher-protocol broadcaster (`reverb`/`pusher`) — LogBroadcaster::auth() is a no-op.
// Signing is pure-local (no live socket server needed), so this doesn't reintroduce
// a container dependency. routes/channels.php was already loaded (against the `log`
// default) by the time this runs, so the channel authorizers must be re-registered
// against the freshly-resolved `reverb` driver instance — re-requiring the route
// file re-runs its Broadcast::channel(...) calls against the new default.
beforeEach(function (): void {
    config(['broadcasting.default' => 'reverb']);
    require base_path('routes/channels.php');
});

it('authorizes a session user for their own private-users channel and rejects others', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $other = User::factory()->for($ws, 'workspace')->create();

    // Session (web guard) auth — the SPA authenticates channels over the session.
    $ok = $this->actingAs($user)->postJson('/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => 'private-users.'.$user->id,
    ]);
    $ok->assertStatus(200);
    expect($ok->json('auth'))->toBeString();

    $this->actingAs($user)->postJson('/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => 'private-users.'.$other->id,
    ])->assertStatus(403);

    Workspace::forgetCurrent();
});
