<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('authorizes a member on their own workspace channel and rejects another workspace', function (): void {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $this->actingInWorkspace($wsA);
    $user = User::factory()->for($wsA, 'workspace')->create(['email_verified_at' => now()]);

    $this->actingAs($user)->postJson('/broadcasting/auth', [
        'socket_id'    => '1234.5678',
        'channel_name' => 'private-workspace.' . $wsA->id,
    ])->assertOk();

    $this->actingAs($user)->postJson('/broadcasting/auth', [
        'socket_id'    => '1234.5678',
        'channel_name' => 'private-workspace.' . $wsB->id,
    ])->assertForbidden();

    Workspace::forgetCurrent();
});

it('authorizes a user only on their own personal channel', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);
    $user  = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $other = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);

    $this->actingAs($user)->postJson('/broadcasting/auth', [
        'socket_id'    => '1234.5678',
        'channel_name' => 'private-users.' . $user->id,
    ])->assertOk();

    $this->actingAs($user)->postJson('/broadcasting/auth', [
        'socket_id'    => '1234.5678',
        'channel_name' => 'private-users.' . $other->id,
    ])->assertForbidden();

    Workspace::forgetCurrent();
});
