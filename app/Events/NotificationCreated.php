<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

final class NotificationCreated implements ShouldBroadcast
{
    use Dispatchable;

    public function __construct(
        public readonly string $userId,
        public readonly string $id,
        public readonly string $type,
    ) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('users.' . $this->userId)];
    }

    public function broadcastAs(): string
    {
        return 'NotificationCreated';
    }

    /** @return array<string, string> */
    public function broadcastWith(): array
    {
        return ['id' => $this->id, 'type' => $this->type];
    }
}
