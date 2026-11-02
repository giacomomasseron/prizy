<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationSubscriptionRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method array run(User $actor)
 */
final class GetNotificationSubscriptions extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly NotificationSubscriptionRepository $subscriptions) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /**
     * @return array{subscriptions: array<int, array{scope_type: string, scope_id: string, level: string}>}
     */
    private function execute(User $actor): array
    {
        return [
            'subscriptions' => $this->subscriptions->listFor($actor->id),
        ];
    }
}
