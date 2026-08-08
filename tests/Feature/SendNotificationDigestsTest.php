<?php

declare(strict_types=1);

use App\Models\Notification as NotificationRow;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\NotificationDigest;
use App\Repositories\NotificationPreferenceRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

afterEach(fn () => Carbon::setTestNow());

function seedNotif(Workspace $ws, User $user, array $attrs = []): NotificationRow
{
    return NotificationRow::create(array_merge([
        'id' => (string) Str::uuid(), 'user_id' => $user->id,
        'type' => 'issue_assigned', 'subject_type' => 'issue', 'subject_id' => (string) Str::uuid(),
    ], $attrs));
}

it('emails a daily user their new unread notifications and advances last_digest_sent_at', function (): void {
    Notification::fake();
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $daily = User::factory()->for($ws, 'workspace')->create(['email_digest_frequency' => 'daily', 'email_verified_at' => now()]);
    $off = User::factory()->for($ws, 'workspace')->create(['email_digest_frequency' => 'off', 'email_verified_at' => now()]);
    $knownSubjectId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    seedNotif($ws, $daily, ['subject_id' => $knownSubjectId, 'subject_type' => 'issue']);
    seedNotif($ws, $daily);
    seedNotif($ws, $off);
    $slug = $ws->slug;
    Workspace::forgetCurrent();

    $this->artisan('notifications:send-digests', ['--frequency' => 'daily'])->assertExitCode(0);

    Notification::assertSentTo($daily, NotificationDigest::class, function (NotificationDigest $n) use ($daily, $slug, $knownSubjectId): bool {
        $mail = $n->toMail($daily);
        $body = implode(' ', $mail->introLines);

        return str_contains($body, $slug)
            && str_contains($body, '/issues/')
            && str_contains($body, $knownSubjectId);
    });
    Notification::assertNotSentTo($off, NotificationDigest::class);

    $ws->makeCurrent();
    expect($daily->refresh()->last_digest_sent_at)->not->toBeNull();
    Workspace::forgetCurrent();
});

it('does not email when there is nothing new since the last digest', function (): void {
    Notification::fake();
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $user = User::factory()->for($ws, 'workspace')->create(['email_digest_frequency' => 'daily', 'last_digest_sent_at' => now(), 'email_verified_at' => now()]);
    // Notification created BEFORE last_digest_sent_at (older) → excluded.
    seedNotif($ws, $user, ['created_at' => now()->subDay()]);
    Workspace::forgetCurrent();

    $this->artisan('notifications:send-digests', ['--frequency' => 'daily'])->assertExitCode(0);
    Notification::assertNotSentTo($user, NotificationDigest::class);

    Workspace::forgetCurrent();
});

it('excludes archived and currently-snoozed notifications from the digest, but includes expired-snoozed ones', function (): void {
    Carbon::setTestNow(Carbon::parse('2026-08-08 12:00:00', 'UTC'));
    Notification::fake();
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $user = User::factory()->for($ws, 'workspace')->create(['email_digest_frequency' => 'daily', 'email_verified_at' => now()]);

    $plainId = 'aaaaaaaa-0000-0000-0000-000000000001';
    $archivedId = 'aaaaaaaa-0000-0000-0000-000000000002';
    $snoozedId = 'aaaaaaaa-0000-0000-0000-000000000003';
    $expiredSnoozeId = 'aaaaaaaa-0000-0000-0000-000000000004';

    seedNotif($ws, $user, ['subject_id' => $plainId]);
    seedNotif($ws, $user, ['subject_id' => $archivedId, 'archived_at' => now()]);
    seedNotif($ws, $user, ['subject_id' => $snoozedId, 'snoozed_until' => now()->addHour()]);
    seedNotif($ws, $user, ['subject_id' => $expiredSnoozeId, 'snoozed_until' => now()->subHour()]);
    Workspace::forgetCurrent();

    $this->artisan('notifications:send-digests', ['--frequency' => 'daily'])->assertExitCode(0);

    Notification::assertSentTo($user, NotificationDigest::class, function (NotificationDigest $n) use ($user, $plainId, $archivedId, $snoozedId, $expiredSnoozeId): bool {
        $mail = $n->toMail($user);
        $body = implode(' ', $mail->introLines);

        return str_contains($body, $plainId)
            && str_contains($body, $expiredSnoozeId)
            && ! str_contains($body, $archivedId)
            && ! str_contains($body, $snoozedId);
    });

    Workspace::forgetCurrent();
});

it('excludes notifications whose event has email disabled, but still includes ones with email on and keeps the excluded row in-app', function (): void {
    Notification::fake();
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $user = User::factory()->for($ws, 'workspace')->create(['email_digest_frequency' => 'daily', 'email_verified_at' => now()]);

    // Turn OFF email for `comment` (default is already off, but make the override explicit for the test).
    app(NotificationPreferenceRepository::class)->setPreference($user->id, 'comment', 'email', false);

    $commentId = 'aaaaaaaa-1111-0000-0000-000000000001';
    $mentionId = 'aaaaaaaa-1111-0000-0000-000000000002';

    $commentNotif = seedNotif($ws, $user, ['subject_id' => $commentId, 'type' => 'issue_commented']);
    seedNotif($ws, $user, ['subject_id' => $mentionId, 'type' => 'issue_mentioned']);
    Workspace::forgetCurrent();

    $this->artisan('notifications:send-digests', ['--frequency' => 'daily'])->assertExitCode(0);

    Notification::assertSentTo($user, NotificationDigest::class, function (NotificationDigest $n) use ($user, $commentId, $mentionId): bool {
        $mail = $n->toMail($user);
        $body = implode(' ', $mail->introLines);

        return str_contains($body, $mentionId)
            && ! str_contains($body, $commentId);
    });

    // The excluded comment notification is untouched in-app — still present, still unread.
    $ws->makeCurrent();
    expect($commentNotif->refresh()->read_at)->toBeNull();
    Workspace::forgetCurrent();
});
