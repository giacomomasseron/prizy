<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\Notification;
use App\Models\User;
use App\Repositories\NotificationRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class ToggleNotificationSnooze
{
    public function __construct(private readonly NotificationRepository $notifications) {}

    public function handle(User $actor, string $id): Notification
    {
        $notification = $this->notifications->findForUser($id, $actor->id);
        if ($notification === null) {
            throw (new ModelNotFoundException)->setModel(Notification::class, [$id]);
        }

        return $this->notifications->toggleSnooze($notification);
    }
}
