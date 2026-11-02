<?php

declare(strict_types=1);

namespace App\Events;

use App\Events\Concerns\CarriesProjectMessage;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

/** A message edited in a project's chat (PRD §3.2.11): its new text and links, fired once they are saved. */
final class ProjectMessageEdited implements ShouldBroadcast
{
    use CarriesProjectMessage;
    use Dispatchable;

    public function broadcastAs(): string
    {
        return 'ProjectMessageEdited';
    }
}
