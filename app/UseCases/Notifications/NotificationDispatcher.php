<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\Notification;
use App\Repositories\NotificationPreferenceRepository;
use App\Repositories\NotificationRepository;
use App\Repositories\NotificationSubscriptionRepository;

/**
 * Single chokepoint for creating a notification: gates creation first on the
 * recipient's team/project subscription level for issue-scoped subjects (via
 * NotificationSubscriptionRepository::levelFor — 'off' always skips, 'mentions'
 * skips everything except issue_mentioned), then on the recipient's `in_app`
 * preference for the event category $type maps to (via
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
        private readonly NotificationSubscriptionRepository $subscriptions,
    ) {}

    public function dispatch(
        string $recipientId,
        string $type,
        string $subjectType,
        string $subjectId,
        ?string $actorId = null,
        ?string $body = null,
        ?string $teamId = null,
        ?string $projectId = null,
    ): ?Notification {
        if ($subjectType === 'issue' && $teamId !== null) {
            $level = $this->subscriptions->levelFor($recipientId, $teamId, $projectId);

            if ($level === 'off') {
                return null;
            }

            if ($level === 'mentions' && $type !== 'issue_mentioned') {
                return null;
            }
        }

        $eventType = NotificationPreferenceRepository::TYPE_TO_EVENT[$type] ?? null;

        if ($eventType !== null && ! $this->preferences->wants($recipientId, $eventType, 'in_app')) {
            return null;
        }

        return $this->notifications->create($recipientId, $type, $subjectType, $subjectId, $actorId, $body);
    }
}
