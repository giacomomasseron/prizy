<?php

declare(strict_types=1);

namespace App\UseCases\Notifications;

use App\Models\User;
use App\Repositories\NotificationSubscriptionRepository;

final class GetNotificationSubscriptions
{
    public function __construct(private readonly NotificationSubscriptionRepository $subscriptions) {}

    /**
     * @return array{subscriptions: array<int, array{scope_type: string, scope_id: string, level: string}>}
     */
    public function handle(User $actor): array
    {
        return [
            'subscriptions' => $this->subscriptions->listFor($actor->id),
        ];
    }
}
