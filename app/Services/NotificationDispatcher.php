<?php

declare(strict_types=1);

namespace App\Services;

use App\Events\NotificationCreated;
use App\Models\Notification;
use App\Repositories\NotificationPreferenceRepository;
use App\Repositories\NotificationRepository;

/**
 * Single chokepoint for creating a notification + broadcasting it: gates
 * creation on the recipient's `in_app` preference for the event category
 * $type maps to (via NotificationPreferenceRepository::TYPE_TO_EVENT), then
 * persists + fires NotificationCreated. Types with no known event-category
 * mapping default to creating (never silently dropped).
 */
final class NotificationDispatcher
{
    public function __construct(
        private readonly NotificationRepository $notifications,
        private readonly NotificationPreferenceRepository $preferences,
    ) {}

    public function dispatch(
        string $recipientId,
        string $type,
        string $subjectType,
        string $subjectId,
        ?string $actorId = null,
        ?string $body = null,
    ): ?Notification {
        $eventType = NotificationPreferenceRepository::TYPE_TO_EVENT[$type] ?? null;

        if ($eventType !== null && ! $this->preferences->wants($recipientId, $eventType, 'in_app')) {
            return null;
        }

        $notification = $this->notifications->create($recipientId, $type, $subjectType, $subjectId, $actorId, $body);

        event(new NotificationCreated($recipientId, $notification->id, $type));

        return $notification;
    }
}
