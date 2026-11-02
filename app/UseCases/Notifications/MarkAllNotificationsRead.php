<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method void run(User $actor)
 */
final class MarkAllNotificationsRead extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly NotificationRepository $notifications) {}

    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor): void
    {
        $this->notifications->markAllReadForUser($actor->id);
    }
}
