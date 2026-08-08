<?php

declare(strict_types=1);

use App\Models\Notification;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\NotificationPreferenceRepository;
use App\Repositories\NotificationSubscriptionRepository;
use App\UseCases\Notifications\NotificationDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:User,1:User} [recipient, actor] */
function dispatcherWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $recipient = User::factory()->for($ws, 'workspace')->create();
    $actor = User::factory()->for($ws, 'workspace')->create();

    return [$recipient, $actor];
}

it('creates a notification and returns it when the recipient has default (in_app on) prefs', function (): void {
    [$recipient, $actor] = dispatcherWorld();
    $subjectId = (string) Str::uuid();

    $notification = app(NotificationDispatcher::class)->dispatch(
        $recipient->id, 'issue_assigned', 'issue', $subjectId, $actor->id, 'Ship it',
    );

    expect($notification)->toBeInstanceOf(Notification::class);
    $this->assertDatabaseHas('notifications', [
        'user_id' => $recipient->id,
        'type' => 'issue_assigned',
        'actor_id' => $actor->id,
        'subject_id' => $subjectId,
        'body' => 'Ship it',
    ]);

    Workspace::forgetCurrent();
});

it('skips creation and returns null when the recipient has turned the in_app pref off for that event', function (): void {
    [$recipient, $actor] = dispatcherWorld();
    app(NotificationPreferenceRepository::class)->setPreference($recipient->id, 'assign', 'in_app', false);

    $result = app(NotificationDispatcher::class)->dispatch(
        $recipient->id, 'issue_assigned', 'issue', (string) Str::uuid(), $actor->id, 'Ship it',
    );

    expect($result)->toBeNull();
    $this->assertDatabaseCount('notifications', 0);

    Workspace::forgetCurrent();
});

it('still creates other event types when only one event category is muted', function (): void {
    [$recipient, $actor] = dispatcherWorld();
    app(NotificationPreferenceRepository::class)->setPreference($recipient->id, 'assign', 'in_app', false);

    $notification = app(NotificationDispatcher::class)->dispatch(
        $recipient->id, 'issue_mentioned', 'issue', (string) Str::uuid(), $actor->id, 'hey @you',
    );

    expect($notification)->not->toBeNull();
    $this->assertDatabaseHas('notifications', ['user_id' => $recipient->id, 'type' => 'issue_mentioned']);

    Workspace::forgetCurrent();
});

it('maps each issue_* type to the correct event category and respects that category\'s pref', function (string $type, string $eventCategory): void {
    [$recipient, $actor] = dispatcherWorld();
    app(NotificationPreferenceRepository::class)->setPreference($recipient->id, $eventCategory, 'in_app', false);

    $result = app(NotificationDispatcher::class)->dispatch(
        $recipient->id, $type, 'issue', (string) Str::uuid(), $actor->id, null,
    );

    expect($result)->toBeNull();
    $this->assertDatabaseCount('notifications', 0);

    Workspace::forgetCurrent();
})->with([
    'issue_mentioned -> mention' => ['issue_mentioned', 'mention'],
    'issue_assigned -> assign' => ['issue_assigned', 'assign'],
    'issue_commented -> comment' => ['issue_commented', 'comment'],
    'issue_status_changed -> status' => ['issue_status_changed', 'status'],
    'issue_unblocked -> unblocked' => ['issue_unblocked', 'unblocked'],
]);

it('defaults to creating when the type has no known event-category mapping', function (): void {
    [$recipient, $actor] = dispatcherWorld();

    $notification = app(NotificationDispatcher::class)->dispatch(
        $recipient->id, 'some_unmapped_type', 'issue', (string) Str::uuid(), $actor->id, null,
    );

    expect($notification)->not->toBeNull();
    $this->assertDatabaseHas('notifications', ['user_id' => $recipient->id, 'type' => 'some_unmapped_type']);

    Workspace::forgetCurrent();
});

it('skips creation and returns null when the recipient has a team-level "off" subscription', function (): void {
    [$recipient, $actor] = dispatcherWorld();
    $teamId = (string) Str::uuid();
    $projectId = (string) Str::uuid();
    app(NotificationSubscriptionRepository::class)->setSubscription($recipient->id, 'team', $teamId, 'off');

    $result = app(NotificationDispatcher::class)->dispatch(
        $recipient->id, 'issue_commented', 'issue', (string) Str::uuid(), $actor->id, 'hi', $teamId, $projectId,
    );

    expect($result)->toBeNull();
    $this->assertDatabaseCount('notifications', 0);

    Workspace::forgetCurrent();
});

it('creates on issue_mentioned but skips other issue_* types for a "mentions"-level subscription', function (string $type): void {
    [$recipient, $actor] = dispatcherWorld();
    $teamId = (string) Str::uuid();
    app(NotificationSubscriptionRepository::class)->setSubscription($recipient->id, 'team', $teamId, 'mentions');

    $result = app(NotificationDispatcher::class)->dispatch(
        $recipient->id, $type, 'issue', (string) Str::uuid(), $actor->id, 'hi', $teamId, null,
    );

    if ($type === 'issue_mentioned') {
        expect($result)->not->toBeNull();
        $this->assertDatabaseHas('notifications', ['user_id' => $recipient->id, 'type' => 'issue_mentioned']);
    } else {
        expect($result)->toBeNull();
        $this->assertDatabaseCount('notifications', 0);
    }

    Workspace::forgetCurrent();
})->with([
    'issue_mentioned' => ['issue_mentioned'],
    'issue_commented' => ['issue_commented'],
    'issue_status_changed' => ['issue_status_changed'],
    'issue_assigned' => ['issue_assigned'],
]);

it('creates when the subscription level is "all"', function (): void {
    [$recipient, $actor] = dispatcherWorld();
    $teamId = (string) Str::uuid();
    app(NotificationSubscriptionRepository::class)->setSubscription($recipient->id, 'team', $teamId, 'all');

    $notification = app(NotificationDispatcher::class)->dispatch(
        $recipient->id, 'issue_commented', 'issue', (string) Str::uuid(), $actor->id, 'hi', $teamId, null,
    );

    expect($notification)->not->toBeNull();
    $this->assertDatabaseHas('notifications', ['user_id' => $recipient->id, 'type' => 'issue_commented']);

    Workspace::forgetCurrent();
});

it('creates when there is no subscription row at all (default "all")', function (): void {
    [$recipient, $actor] = dispatcherWorld();
    $teamId = (string) Str::uuid();

    $notification = app(NotificationDispatcher::class)->dispatch(
        $recipient->id, 'issue_commented', 'issue', (string) Str::uuid(), $actor->id, 'hi', $teamId, null,
    );

    expect($notification)->not->toBeNull();
    $this->assertDatabaseHas('notifications', ['user_id' => $recipient->id, 'type' => 'issue_commented']);

    Workspace::forgetCurrent();
});

it('lets a project-level "off" subscription override a team-level "all" subscription', function (): void {
    [$recipient, $actor] = dispatcherWorld();
    $teamId = (string) Str::uuid();
    $projectId = (string) Str::uuid();
    $subs = app(NotificationSubscriptionRepository::class);
    $subs->setSubscription($recipient->id, 'team', $teamId, 'all');
    $subs->setSubscription($recipient->id, 'project', $projectId, 'off');

    $result = app(NotificationDispatcher::class)->dispatch(
        $recipient->id, 'issue_commented', 'issue', (string) Str::uuid(), $actor->id, 'hi', $teamId, $projectId,
    );

    expect($result)->toBeNull();
    $this->assertDatabaseCount('notifications', 0);

    Workspace::forgetCurrent();
});

it('still applies the in_app preference gate after the subscription gate passes', function (): void {
    [$recipient, $actor] = dispatcherWorld();
    $teamId = (string) Str::uuid();
    app(NotificationSubscriptionRepository::class)->setSubscription($recipient->id, 'team', $teamId, 'all');
    app(NotificationPreferenceRepository::class)->setPreference($recipient->id, 'comment', 'in_app', false);

    $result = app(NotificationDispatcher::class)->dispatch(
        $recipient->id, 'issue_commented', 'issue', (string) Str::uuid(), $actor->id, 'hi', $teamId, null,
    );

    expect($result)->toBeNull();
    $this->assertDatabaseCount('notifications', 0);

    Workspace::forgetCurrent();
});

it('does not apply the subscription gate when teamId is not passed (backward compatible)', function (): void {
    [$recipient, $actor] = dispatcherWorld();

    // No teamId passed at all — subscription gate must be skipped entirely,
    // even for a subject type of "issue".
    $notification = app(NotificationDispatcher::class)->dispatch(
        $recipient->id, 'issue_commented', 'issue', (string) Str::uuid(), $actor->id, 'hi',
    );

    expect($notification)->not->toBeNull();

    Workspace::forgetCurrent();
});
