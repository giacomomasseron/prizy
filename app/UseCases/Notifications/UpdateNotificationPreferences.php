<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationRepository;

final class UpdateNotificationPreferences
{
    public function __construct(private readonly NotificationRepository $notifications) {}

    public function handle(User $actor, string $frequency): void
    {
        $this->notifications->setDigestFrequency($actor, $frequency);
    }
}
