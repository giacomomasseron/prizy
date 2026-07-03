<?php

declare(strict_types=1);

use App\Models\Notification as NotificationRow;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\NotificationDigest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

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
