<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationPreferenceRepository;
use App\Repositories\NotificationRepository;

final class UpdateNotificationPreferences
{
    public function __construct(
        private readonly NotificationRepository $notifications,
        private readonly NotificationPreferenceRepository $preferences,
    ) {}

    /** @param array<int, array{event_type: string, channel: string, enabled: bool}> $preferences */
    public function handle(User $actor, ?string $frequency, array $preferences = []): void
    {
        if ($frequency !== null) {
            $this->notifications->setDigestFrequency($actor, $frequency);
        }

        foreach ($preferences as $preference) {
            $this->preferences->setPreference(
                $actor->id,
                $preference['event_type'],
                $preference['channel'],
                (bool) $preference['enabled'],
            );
        }
    }
}
