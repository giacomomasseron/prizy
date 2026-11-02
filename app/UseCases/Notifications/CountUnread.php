<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method int run(User $actor)
 */
final class CountUnread extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly NotificationRepository $notifications) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(User $actor): int
    {
        return $this->notifications->unreadCountForUser($actor->id);
    }
}
