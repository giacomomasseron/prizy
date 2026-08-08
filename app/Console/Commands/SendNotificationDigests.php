<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\NotificationDigest;
use App\Support\Notifications\NotificationText;
use Illuminate\Console\Command;

final class SendNotificationDigests extends Command
{
    protected $signature = 'notifications:send-digests {--frequency=daily}';

    protected $description = 'Email each opted-in user a digest of their new unread notifications.';

    public function handle(): int
    {
        /** @var string $frequency */
        $frequency = $this->option('frequency');

        Workspace::all()->each(function (Workspace $workspace) use ($frequency): void {
            $workspace->makeCurrent();

            try {
                User::query()->where('email_digest_frequency', $frequency)->get()->each(
                    fn (User $user) => $this->digestFor($workspace, $user),
                );
            } catch (\Throwable $e) {
                $this->warn("Digest run failed for workspace {$workspace->slug}: {$e->getMessage()}");
            } finally {
                Workspace::forgetCurrent();
            }
        });

        return self::SUCCESS;
    }

    private function digestFor(Workspace $workspace, User $user): void
    {
        $notifications = Notification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->whereNull('archived_at')
            ->where(function ($q) {
                $q->whereNull('snoozed_until')->orWhere('snoozed_until', '<=', now());
            })
            ->when($user->last_digest_sent_at, fn ($q, $last) => $q->where('created_at', '>', $last))
            ->orderBy('created_at')
            ->get();

        if ($notifications->isEmpty()) {
            return;
        }

        $items = $notifications->map(fn (Notification $n): array => [
            'text' => NotificationText::label($n->type),
            'url' => $this->urlFor($workspace, $n),
        ])->all();

        $user->notify(new NotificationDigest($items, $workspace->name));
        $user->last_digest_sent_at = now();
        $user->save();
    }

    private function urlFor(Workspace $workspace, Notification $n): string
    {
        $scheme = str_starts_with((string) config('app.url'), 'https') ? 'https' : 'http';
        $base = "{$scheme}://{$workspace->slug}.".config('app.base_domain');

        return $n->subject_type === 'issue'
            ? "{$base}/issues/{$n->subject_id}"
            : "{$base}/notifications";
    }
}
