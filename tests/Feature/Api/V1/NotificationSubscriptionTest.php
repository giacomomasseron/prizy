<?php

declare(strict_types=1);

use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\NotificationSubscriptionRepository;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function addUserToTeamForSubscriptionTest(User $user, Team $team): void
{
    DB::table('team_members')->insert([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'role' => 'member',
    ]);
}

it('returns the acting user subscription rows', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $team = Team::factory()->create();
    addUserToTeamForSubscriptionTest($user, $team);

    app(NotificationSubscriptionRepository::class)->setSubscription($user->id, 'team', $team->id, 'off');

    $response = $this->withToken($token)->getJson('/v1/notifications/subscriptions')->assertStatus(200);

    $response->assertJson([
        'data' => [
            'subscriptions' => [
                ['scope_type' => 'team', 'scope_id' => $team->id, 'level' => 'off'],
            ],
        ],
    ]);

    Workspace::forgetCurrent();
});

it('upserts a subscription via PATCH and reflects the new level on GET', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $team = Team::factory()->create();
    addUserToTeamForSubscriptionTest($user, $team);

    $this->withToken($token)->patchJson('/v1/notifications/subscriptions', [
        'scope_type' => 'team',
        'scope_id' => $team->id,
        'level' => 'mentions',
    ])->assertStatus(204);

    $response = $this->withToken($token)->getJson('/v1/notifications/subscriptions')->assertStatus(200);
    $response->assertJson([
        'data' => [
            'subscriptions' => [
                ['scope_type' => 'team', 'scope_id' => $team->id, 'level' => 'mentions'],
            ],
        ],
    ]);

    // A second PATCH to the same scope updates the existing row rather than adding a new one.
    $this->withToken($token)->patchJson('/v1/notifications/subscriptions', [
        'scope_type' => 'team',
        'scope_id' => $team->id,
        'level' => 'off',
    ])->assertStatus(204);

    $this->assertDatabaseCount('notification_subscriptions', 1);
    $this->assertDatabaseHas('notification_subscriptions', [
        'user_id' => $user->id,
        'scope_type' => 'team',
        'scope_id' => $team->id,
        'level' => 'off',
    ]);

    Workspace::forgetCurrent();
});

it('rejects an invalid scope_type, level, or scope_id with a 422', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $team = Team::factory()->create();

    $this->withToken($token)->patchJson('/v1/notifications/subscriptions', [
        'scope_type' => 'workspace',
        'scope_id' => $team->id,
        'level' => 'mentions',
    ])->assertStatus(422);

    $this->withToken($token)->patchJson('/v1/notifications/subscriptions', [
        'scope_type' => 'team',
        'scope_id' => $team->id,
        'level' => 'everything',
    ])->assertStatus(422);

    $this->withToken($token)->patchJson('/v1/notifications/subscriptions', [
        'scope_type' => 'team',
        'scope_id' => 'not-a-uuid',
        'level' => 'mentions',
    ])->assertStatus(422);

    Workspace::forgetCurrent();
});

it('does not return another user subscriptions', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);

    $userA = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $userB = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $tokenA = app(CreatePersonalAccessToken::class)->handle($userA, 't', null)['token'];

    $team = Team::factory()->create();
    addUserToTeamForSubscriptionTest($userA, $team);
    addUserToTeamForSubscriptionTest($userB, $team);

    app(NotificationSubscriptionRepository::class)->setSubscription($userB->id, 'team', $team->id, 'off');

    $response = $this->withToken($tokenA)->getJson('/v1/notifications/subscriptions')->assertStatus(200);
    $response->assertJsonPath('data.subscriptions', []);

    Workspace::forgetCurrent();
});
