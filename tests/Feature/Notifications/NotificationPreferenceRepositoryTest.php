<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\Repositories\NotificationPreferenceRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function makeUserForPrefs(): User
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);

    return User::factory()->for($ws, 'workspace')->create();
}

it('returns the code default for comment/email (false) and mention/email (true) with no override', function (): void {
    $user = makeUserForPrefs();
    $repo = app(NotificationPreferenceRepository::class);

    expect($repo->wants($user->id, 'comment', 'email'))->toBeFalse();
    expect($repo->wants($user->id, 'mention', 'email'))->toBeTrue();

    Workspace::forgetCurrent();
});

it('returns the code default for status/in_app (true) with no override', function (): void {
    $user = makeUserForPrefs();
    $repo = app(NotificationPreferenceRepository::class);

    expect($repo->wants($user->id, 'status', 'in_app'))->toBeTrue();

    Workspace::forgetCurrent();
});

it('overrides the default once setPreference is called', function (): void {
    $user = makeUserForPrefs();
    $repo = app(NotificationPreferenceRepository::class);

    expect($repo->wants($user->id, 'comment', 'in_app'))->toBeTrue();

    $repo->setPreference($user->id, 'comment', 'in_app', false);

    expect($repo->wants($user->id, 'comment', 'in_app'))->toBeFalse();

    Workspace::forgetCurrent();
});

it('returns a full matrix of 5 event types with in_app and email booleans', function (): void {
    $user = makeUserForPrefs();
    $repo = app(NotificationPreferenceRepository::class);

    $matrix = $repo->matrixFor($user->id);

    expect($matrix)->toHaveCount(5);
    expect(collect($matrix)->pluck('event_type')->all())->toEqual(NotificationPreferenceRepository::EVENT_TYPES);

    foreach ($matrix as $row) {
        expect($row)->toHaveKeys(['event_type', 'in_app', 'email']);
        expect($row['in_app'])->toBeBool();
        expect($row['email'])->toBeBool();
    }

    Workspace::forgetCurrent();
});

it('upserts on a repeated setPreference call for the same key without duplicating the row', function (): void {
    $user = makeUserForPrefs();
    $repo = app(NotificationPreferenceRepository::class);

    $repo->setPreference($user->id, 'assign', 'email', false);
    $repo->setPreference($user->id, 'assign', 'email', true);

    expect($repo->wants($user->id, 'assign', 'email'))->toBeTrue();

    $this->assertDatabaseCount('notification_preferences', 1);
    $this->assertDatabaseHas('notification_preferences', [
        'user_id' => $user->id,
        'event_type' => 'assign',
        'channel' => 'email',
        'enabled' => true,
    ]);

    Workspace::forgetCurrent();
});

it('scopes preferences to the workspace and does not leak across tenants', function (): void {
    $userA = makeUserForPrefs();
    $repoA = app(NotificationPreferenceRepository::class);
    $repoA->setPreference($userA->id, 'mention', 'in_app', false);
    Workspace::forgetCurrent();

    $userB = makeUserForPrefs();
    $repoB = app(NotificationPreferenceRepository::class);

    expect($repoB->wants($userB->id, 'mention', 'in_app'))->toBeTrue();

    Workspace::forgetCurrent();
});
