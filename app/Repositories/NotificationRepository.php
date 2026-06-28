<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Notification;
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
}
