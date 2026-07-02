<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationRepository;

final class MarkAllNotificationsRead
{
    public function __construct(private readonly NotificationRepository $notifications) {}

    public function handle(User $actor): void
    {
        $this->notifications->markAllReadForUser($actor->id);
    }
}
