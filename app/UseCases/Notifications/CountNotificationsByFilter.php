<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * What the Inbox shows beside each of its filters.
 *
 * @method array{all: int, mention: int, assign: int, support: int, snoozed: int, archived: int} run(User $actor)
 */
final class CountNotificationsByFilter extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly NotificationRepository $notifications) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return array{all: int, mention: int, assign: int, support: int, snoozed: int, archived: int} */
    private function execute(User $actor): array
    {
        return $this->notifications->filterCountsForUser($actor->id);
    }
}
