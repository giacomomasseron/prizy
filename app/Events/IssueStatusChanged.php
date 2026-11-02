<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Issue;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

final class IssueStatusChanged implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public readonly Issue $issue,
        public readonly string $from,
        public readonly string $to,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('workspace.' . $this->issue->workspace_id);
    }

    /** @return array<string, string> */
    public function broadcastWith(): array
    {
        return ['id' => $this->issue->id, 'from' => $this->from, 'to' => $this->to];
    }
}
