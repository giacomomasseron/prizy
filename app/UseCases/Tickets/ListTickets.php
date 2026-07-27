<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\Ticket;
use App\Models\User;
use App\Repositories\TicketRepository;
use Illuminate\Database\Eloquent\Collection;

final class ListTickets
{
    public function __construct(private readonly TicketRepository $tickets) {}

    /**
     * @param  array<string, string>  $filters
     * @return Collection<int, Ticket>
     */
    public function handle(User $actor, array $filters = []): Collection
    {
        abort_unless($actor->is_agent, 403);

        return $this->tickets->forWorkspace($actor->workspace_id, $filters);
    }
}
