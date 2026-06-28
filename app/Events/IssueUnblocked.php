<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Issue;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

final class IssueUnblocked implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public readonly Issue $issue,
        public readonly string $assigneeId,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('users.' . $this->assigneeId);
    }

    /** @return array<string, string> */
    public function broadcastWith(): array
    {
        return ['id' => $this->issue->id];
    }
}
