<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\Notification;
use App\Models\User;
use App\Repositories\NotificationRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @method static Notification run(User $actor, string $id)
 */
final class ToggleNotificationSnooze extends BaseUseCase implements UseCaseInterface
{
    private readonly NotificationRepository $notifications;

    public function handle(mixed ...$arguments): mixed
    {
        $this->notifications = app(NotificationRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(User $actor, string $id): Notification
    {
        $notification = $this->notifications->findForUser($id, $actor->id);
        if ($notification === null) {
            throw (new ModelNotFoundException)->setModel(Notification::class, [$id]);
        }

        return $this->notifications->toggleSnooze($notification);
    }
}
