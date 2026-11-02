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
 * @method Notification run(User $actor, string $id)
 */
final class ToggleNotificationArchive extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly NotificationRepository $notifications) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(User $actor, string $id): Notification
    {
        $notification = $this->notifications->findForUser($id, $actor->id);
        if ($notification === null) {
            throw (new ModelNotFoundException)->setModel(Notification::class, [$id]);
        }

        return $this->notifications->toggleArchive($notification);
    }
}
