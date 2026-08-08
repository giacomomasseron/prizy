<?php

declare(strict_types=1);

use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\NotificationSubscriptionRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function makeUserForSubscriptions(): User
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);

    return User::factory()->for($ws, 'workspace')->create();
}

function addUserToTeam(User $user, Team $team): void
{
    DB::table('team_members')->insert([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'role' => 'member',
    ]);
}

it('returns "all" by default with no subscription rows', function (): void {
    $user = makeUserForSubscriptions();
    $repo = app(NotificationSubscriptionRepository::class);

    $teamId = (string) Str::uuid();

    expect($repo->levelFor($user->id, $teamId, null))->toBe('all');

    Workspace::forgetCurrent();
});

it('returns the team-scoped level when a team subscription row exists', function (): void {
    $user = makeUserForSubscriptions();
    $repo = app(NotificationSubscriptionRepository::class);

    $teamId = (string) Str::uuid();
    $repo->setSubscription($user->id, 'team', $teamId, 'mentions');

    expect($repo->levelFor($user->id, $teamId, null))->toBe('mentions');

    Workspace::forgetCurrent();
});

it('lets a project-scoped row override the team-scoped row', function (): void {
    $user = makeUserForSubscriptions();
    $repo = app(NotificationSubscriptionRepository::class);

    $teamId = (string) Str::uuid();
    $projectId = (string) Str::uuid();

    $repo->setSubscription($user->id, 'team', $teamId, 'all');
    $repo->setSubscription($user->id, 'project', $projectId, 'off');

    expect($repo->levelFor($user->id, $teamId, $projectId))->toBe('off');

    // Without the project scope, the team-level row still applies.
    expect($repo->levelFor($user->id, $teamId, null))->toBe('all');

    Workspace::forgetCurrent();
});

it('falls back to the team row when a projectId is passed but no project row exists', function (): void {
    $user = makeUserForSubscriptions();
    $repo = app(NotificationSubscriptionRepository::class);

    $teamId = (string) Str::uuid();
    $projectId = (string) Str::uuid();

    $repo->setSubscription($user->id, 'team', $teamId, 'mentions');

    expect($repo->levelFor($user->id, $teamId, $projectId))->toBe('mentions');

    Workspace::forgetCurrent();
});

it('upserts on a repeated setSubscription call for the same key without duplicating the row', function (): void {
    $user = makeUserForSubscriptions();
    $repo = app(NotificationSubscriptionRepository::class);

    $teamId = (string) Str::uuid();

    $repo->setSubscription($user->id, 'team', $teamId, 'mentions');
    $idAfterFirst = DB::table('notification_subscriptions')
        ->where(['user_id' => $user->id, 'scope_type' => 'team', 'scope_id' => $teamId])->value('id');

    $repo->setSubscription($user->id, 'team', $teamId, 'off');

    expect($repo->levelFor($user->id, $teamId, null))->toBe('off');

    // The upsert must UPDATE the same row — the primary key must not be reassigned
    // (guards against putting `id` in updateOrCreate's values, which rewrites the PK).
    $idAfterSecond = DB::table('notification_subscriptions')
        ->where(['user_id' => $user->id, 'scope_type' => 'team', 'scope_id' => $teamId])->value('id');
    expect($idAfterSecond)->toBe($idAfterFirst);

    $this->assertDatabaseCount('notification_subscriptions', 1);
    $this->assertDatabaseHas('notification_subscriptions', [
        'user_id' => $user->id,
        'scope_type' => 'team',
        'scope_id' => $teamId,
        'level' => 'off',
    ]);

    Workspace::forgetCurrent();
});

it('scopes subscriptions to the workspace and does not leak across tenants', function (): void {
    $userA = makeUserForSubscriptions();
    $repoA = app(NotificationSubscriptionRepository::class);
    $teamId = (string) Str::uuid();
    $repoA->setSubscription($userA->id, 'team', $teamId, 'off');
    Workspace::forgetCurrent();

    $userB = makeUserForSubscriptions();
    $repoB = app(NotificationSubscriptionRepository::class);

    // A different user (in a different tenant) sees the default, not userA's row.
    expect($repoB->levelFor($userB->id, $teamId, null))->toBe('all');
    expect($repoB->listFor($userB->id))->toBe([]);

    Workspace::forgetCurrent();
});

it('lists the stored team subscriptions for teams the user belongs to', function (): void {
    $user = makeUserForSubscriptions();
    $repo = app(NotificationSubscriptionRepository::class);

    $team = Team::factory()->create();
    addUserToTeam($user, $team);

    $otherTeamId = (string) Str::uuid();

    $repo->setSubscription($user->id, 'team', $team->id, 'mentions');
    // A row for a team the user does NOT belong to should not surface in listFor.
    $repo->setSubscription($user->id, 'team', $otherTeamId, 'off');

    $rows = $repo->listFor($user->id);

    expect($rows)->toBe([
        ['scope_type' => 'team', 'scope_id' => $team->id, 'level' => 'mentions'],
    ]);

    Workspace::forgetCurrent();
});
