<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationSubscriptionRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static void run(User $actor, string $scopeType, string $scopeId, string $level)
 */
final class SetNotificationSubscription extends BaseUseCase implements UseCaseInterface
{
    private readonly NotificationSubscriptionRepository $subscriptions;

    public function handle(mixed ...$arguments): mixed
    {
        $this->subscriptions = app(NotificationSubscriptionRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor, string $scopeType, string $scopeId, string $level): void
    {
        $this->subscriptions->setSubscription($actor->id, $scopeType, $scopeId, $level);
    }
}
