<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Notification;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Str;

final class NotificationRepository
{
    /** workspace_id is auto-filled from the active tenant by BelongsToWorkspace. */
    public function create(string $userId, string $type, string $subjectType, string $subjectId): Notification
    {
        return Notification::create([
            'id'           => (string) Str::uuid(),
            'user_id'      => $userId,
            'type'         => $type,
            'subject_type' => $subjectType,
            'subject_id'   => $subjectId,
        ]);
    }

    public function paginateForUser(string $userId, bool $unreadOnly, int $limit): CursorPaginator
    {
        $query = Notification::query()->where('user_id', $userId)->orderBy('created_at', 'desc')->orderBy('id');
        if ($unreadOnly) {
            $query->whereNull('read_at');
        }

        return $query->cursorPaginate(perPage: $limit, cursorName: 'after');
    }

    public function unreadCountForUser(string $userId): int
    {
        return Notification::query()->where('user_id', $userId)->whereNull('read_at')->count();
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

    public function markAllReadForUser(string $userId): void
    {
        Notification::query()->where('user_id', $userId)->whereNull('read_at')->update(['read_at' => now()]);
    }
}
