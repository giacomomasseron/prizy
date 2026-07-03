<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('authorizes a session user for their own private-users channel and rejects others', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $other = User::factory()->for($ws, 'workspace')->create();

    // Session (web guard) auth — the SPA authenticates channels over the session.
    $ok = $this->actingAs($user)->postJson('/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => 'private-users.' . $user->id,
    ]);
    $ok->assertStatus(200);
    expect($ok->json('auth'))->toBeString();

    $this->actingAs($user)->postJson('/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => 'private-users.' . $other->id,
    ])->assertStatus(403);

    Workspace::forgetCurrent();
});
