<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationPreferenceRepository;

final class GetNotificationPreferences
{
    public function __construct(private readonly NotificationPreferenceRepository $preferences) {}

    /**
     * @return array{
     *     email_digest_frequency: string,
     *     preferences: array<int, array{event_type: string, in_app: bool, email: bool}>,
     * }
     */
    public function handle(User $actor): array
    {
        return [
            'email_digest_frequency' => $actor->email_digest_frequency,
            'preferences' => $this->preferences->matrixFor($actor->id),
        ];
    }
}
