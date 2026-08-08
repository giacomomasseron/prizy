<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationSubscriptionRepository;

final class SetNotificationSubscription
{
    public function __construct(private readonly NotificationSubscriptionRepository $subscriptions) {}

    public function handle(User $actor, string $scopeType, string $scopeId, string $level): void
    {
        $this->subscriptions->setSubscription($actor->id, $scopeType, $scopeId, $level);
    }
}
