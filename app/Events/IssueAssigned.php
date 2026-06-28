<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Issue;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

final class IssueAssigned implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public readonly Issue $issue,
        public readonly ?string $assigneeId,
    ) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        $channels = [new PrivateChannel('workspace.' . $this->issue->workspace_id)];

        if ($this->assigneeId !== null) {
            $channels[] = new PrivateChannel('users.' . $this->assigneeId);
        }

        return $channels;
    }

    /** @return array<string, string|null> */
    public function broadcastWith(): array
    {
        return ['id' => $this->issue->id, 'assignee_id' => $this->assigneeId];
    }
}
