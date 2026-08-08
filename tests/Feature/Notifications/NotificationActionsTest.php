<?php

declare(strict_types=1);

use App\Models\Notification;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\NotificationRepository;
use App\UseCases\Notifications\CountUnread;
use App\UseCases\Notifications\MarkNotificationUnread;
use App\UseCases\Notifications\ToggleNotificationArchive;
use App\UseCases\Notifications\ToggleNotificationSnooze;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

afterEach(fn () => Carbon::setTestNow());

/** @return array{0:Workspace,1:User} */
function notifActionsWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);

    return [$ws, $user];
}

function makeActionNotif(Workspace $ws, User $user, array $attrs = []): Notification
{
    return Notification::create(array_merge([
        'id' => (string) Str::uuid(), 'user_id' => $user->id,
        'type' => 'issue_assigned', 'subject_type' => 'issue', 'subject_id' => (string) Str::uuid(),
    ], $attrs));
}

it('marks a read notification as unread', function (): void {
    [$ws, $user] = notifActionsWorld();
    $notif = makeActionNotif($ws, $user, ['read_at' => now()]);

    $result = app(MarkNotificationUnread::class)->handle($user, $notif->id);

    expect($result->read_at)->toBeNull();
    expect($notif->fresh()->read_at)->toBeNull();

    Workspace::forgetCurrent();
});

it('throws a 404 model-not-found when mark-unread targets another user notification', function (): void {
    [$ws, $user] = notifActionsWorld();
    $other = User::factory()->for($ws, 'workspace')->create();
    $foreign = makeActionNotif($ws, $other);

    app(MarkNotificationUnread::class)->handle($user, $foreign->id);
})->throws(ModelNotFoundException::class);

it('toggles snooze on then off', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-08-01 12:00:00', 'UTC'));
    [$ws, $user] = notifActionsWorld();
    $notif = makeActionNotif($ws, $user);

    $snoozed = app(ToggleNotificationSnooze::class)->handle($user, $notif->id);
    expect($snoozed->snoozed_until)->not->toBeNull();
    expect($snoozed->snoozed_until->isFuture())->toBeTrue();
    expect($snoozed->snoozed_until->equalTo(Carbon::parse('2026-08-02 12:00:00', 'UTC')))->toBeTrue();

    $unsnoozed = app(ToggleNotificationSnooze::class)->handle($user, $notif->id);
    expect($unsnoozed->snoozed_until)->toBeNull();

    Workspace::forgetCurrent();
});

it('re-snoozes an already-expired snooze instead of toggling it off', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-08-01 12:00:00', 'UTC'));
    [$ws, $user] = notifActionsWorld();
    $notif = makeActionNotif($ws, $user, ['snoozed_until' => Carbon::parse('2026-07-01 00:00:00', 'UTC')]);

    $result = app(ToggleNotificationSnooze::class)->handle($user, $notif->id);

    expect($result->snoozed_until)->not->toBeNull();
    expect($result->snoozed_until->isFuture())->toBeTrue();

    Workspace::forgetCurrent();
});

it('throws a 404 model-not-found when toggle-snooze targets another user notification', function (): void {
    [$ws, $user] = notifActionsWorld();
    $other = User::factory()->for($ws, 'workspace')->create();
    $foreign = makeActionNotif($ws, $other);

    app(ToggleNotificationSnooze::class)->handle($user, $foreign->id);
})->throws(ModelNotFoundException::class);

it('toggles archive on then off', function (): void {
    [$ws, $user] = notifActionsWorld();
    $notif = makeActionNotif($ws, $user);

    $archived = app(ToggleNotificationArchive::class)->handle($user, $notif->id);
    expect($archived->archived_at)->not->toBeNull();

    $unarchived = app(ToggleNotificationArchive::class)->handle($user, $notif->id);
    expect($unarchived->archived_at)->toBeNull();

    Workspace::forgetCurrent();
});

it('throws a 404 model-not-found when toggle-archive targets another user notification', function (): void {
    [$ws, $user] = notifActionsWorld();
    $other = User::factory()->for($ws, 'workspace')->create();
    $foreign = makeActionNotif($ws, $other);

    app(ToggleNotificationArchive::class)->handle($user, $foreign->id);
})->throws(ModelNotFoundException::class);

it('excludes archived and currently-snoozed notifications from the unread count, but includes an expired snooze', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-08-01 12:00:00', 'UTC'));
    [$ws, $user] = notifActionsWorld();

    $plain = makeActionNotif($ws, $user);
    $archived = makeActionNotif($ws, $user, ['archived_at' => now()]);
    $activelySnoozed = makeActionNotif($ws, $user, ['snoozed_until' => now()->addDay()]);
    $expiredSnooze = makeActionNotif($ws, $user, ['snoozed_until' => now()->subDay()]);
    // Read notifications never count, regardless of archive/snooze state.
    makeActionNotif($ws, $user, ['read_at' => now()]);

    $count = app(CountUnread::class)->handle($user);

    // Qualifying unread notifications: $plain and $expiredSnooze only.
    expect($count)->toBe(2);

    $repoCount = app(NotificationRepository::class)->unreadCountForUser($user->id);
    expect($repoCount)->toBe(2);

    // Sanity: the plain and expired-snooze ids are the ones actually counted.
    expect($plain->read_at)->toBeNull();
    expect($expiredSnooze->snoozed_until->isPast())->toBeTrue();
    expect($activelySnoozed->snoozed_until->isFuture())->toBeTrue();
    expect($archived->archived_at)->not->toBeNull();

    Workspace::forgetCurrent();
});
