<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\User;
use App\Repositories\TicketRepository;
use App\Services\HelpdeskAccess;

final class CountTickets
{
    public function __construct(private readonly TicketRepository $tickets) {}

    /**
     * @return array{by_status: array<string, int>, by_channel: array<string, int>, unassigned: int, mine_unsolved: int}
     */
    public function handle(User $actor): array
    {
        HelpdeskAccess::gate($actor);

        return $this->tickets->counts($actor->workspace_id, $actor->id);
    }
}
