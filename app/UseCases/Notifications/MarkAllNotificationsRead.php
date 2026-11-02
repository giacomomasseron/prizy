<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static void run(User $actor)
 */
final class MarkAllNotificationsRead extends BaseUseCase implements UseCaseInterface
{
    private readonly NotificationRepository $notifications;

    public function handle(mixed ...$arguments): mixed
    {
        $this->notifications = app(NotificationRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor): void
    {
        $this->notifications->markAllReadForUser($actor->id);
    }
}
