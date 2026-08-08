<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\Notification;
use App\Repositories\NotificationPreferenceRepository;
use App\Repositories\NotificationRepository;

/**
 * Single chokepoint for creating a notification: gates creation on the
 * recipient's `in_app` preference for the event category $type maps to (via
 * NotificationPreferenceRepository::TYPE_TO_EVENT), then persists it. Types
 * with no known event-category mapping default to creating (never silently
 * dropped).
 *
 * Does NOT fire NotificationCreated itself — the caller runs inside a
 * DB::transaction() and must collect a NotificationCreated event from the
 * returned Notification and dispatch it AFTER the transaction commits,
 * alongside its other domain events. This keeps broadcasts from firing for
 * rows that get rolled back.
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

        return $this->notifications->create($recipientId, $type, $subjectType, $subjectId, $actorId, $body);
    }
}
