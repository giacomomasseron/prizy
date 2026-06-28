<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Issue;
use App\Models\IssueComment;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

final class IssueCommented implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public readonly Issue $issue,
        public readonly IssueComment $comment,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('workspace.' . $this->issue->workspace_id);
    }

    /** @return array<string, string> */
    public function broadcastWith(): array
    {
        return ['id' => $this->issue->id, 'comment_id' => $this->comment->id];
    }
}
