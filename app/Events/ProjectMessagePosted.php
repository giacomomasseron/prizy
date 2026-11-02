<?php

declare(strict_types=1);

namespace App\Events;

use App\Events\Concerns\CarriesProjectMessage;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

/** A new message in a project's chat (PRD §3.2.11), fired once it is saved. */
final class ProjectMessagePosted implements ShouldBroadcast
{
    use CarriesProjectMessage;
    use Dispatchable;

    public function broadcastAs(): string
    {
        return 'ProjectMessagePosted';
    }
}
