<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Str;

final class NotificationRepository
{
    /** workspace_id is auto-filled from the active tenant by BelongsToWorkspace. */
    public function create(
        string $userId,
        string $type,
        string $subjectType,
        string $subjectId,
        ?string $actorId = null,
        ?string $body = null,
    ): Notification {
        return Notification::create([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'actor_id' => $actorId,
            'type' => $type,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'body' => $body,
        ]);
    }

    public function paginateForUser(string $userId, bool $unreadOnly, int $limit): CursorPaginator
    {
        $query = Notification::query()->where('user_id', $userId)->with('actor')->orderBy('created_at', 'desc')->orderBy('id');
        if ($unreadOnly) {
            $query->whereNull('read_at');
        }

        return $query->cursorPaginate(perPage: $limit, cursorName: 'after');
    }

    public function unreadCountForUser(string $userId): int
    {
        return Notification::query()
            ->where('user_id', $userId)
            ->whereNull('read_at')
            ->whereNull('archived_at')
            ->where(function ($query) {
                $query->whereNull('snoozed_until')->orWhere('snoozed_until', '<=', now());
            })
            ->count();
    }

    public function findForUser(string $id, string $userId): ?Notification
    {
        return Notification::query()->where('user_id', $userId)->find($id);
    }

    public function markRead(Notification $notification): Notification
    {
        $notification->read_at = now();
        $notification->save();

        return $notification;
    }

    public function markUnread(Notification $notification): Notification
    {
        $notification->read_at = null;
        $notification->save();

        return $notification;
    }

    public function toggleSnooze(Notification $notification): Notification
    {
        $notification->snoozed_until = ($notification->snoozed_until && $notification->snoozed_until->isFuture())
            ? null
            : now()->addDay();
        $notification->save();

        return $notification;
    }

    public function toggleArchive(Notification $notification): Notification
    {
        $notification->archived_at = $notification->archived_at ? null : now();
        $notification->save();

        return $notification;
    }

    public function markAllReadForUser(string $userId): void
    {
        Notification::query()->where('user_id', $userId)->whereNull('read_at')->update(['read_at' => now()]);
    }

    public function setDigestFrequency(User $user, string $frequency): void
    {
        $user->email_digest_frequency = $frequency;
        $user->save();
    }
}
