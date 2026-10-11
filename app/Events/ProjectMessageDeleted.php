<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

/** A message deleted from a project's chat (PRD §3.2.11): open chats drop it. */
final class ProjectMessageDeleted implements ShouldBroadcast
{
    use Dispatchable;

    public function __construct(
        public readonly string $projectId,
        public readonly string $id,
    ) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('project.' . $this->projectId)];
    }

    public function broadcastAs(): string
    {
        return 'ProjectMessageDeleted';
    }

    /** @return array<string, string> */
    public function broadcastWith(): array
    {
        return ['id' => $this->id];
    }
}
