<?php

declare(strict_types=1);

namespace App\Support\Notifications;

/**
 * Per-type human labels for notifications. Keep in sync with the JS
 * `resources/js/features/notifications/text.ts` notificationText().
 */
final class NotificationText
{
    public static function label(string $type): string
    {
        return match ($type) {
            'issue_assigned'  => 'You were assigned an issue',
            'issue_unblocked' => "An issue you're assigned was unblocked",
            'project_mentioned' => 'Mentioned you in project chat',
            default           => 'New notification',
        };
    }
}
