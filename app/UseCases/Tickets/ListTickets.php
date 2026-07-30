<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\User;
use App\Repositories\TicketRepository;
use Illuminate\Pagination\CursorPaginator;

final class ListTickets
{
    public function __construct(private readonly TicketRepository $tickets) {}

    /**
     * @param  array<string, string>  $filters
     */
    public function handle(User $actor, array $filters = [], string $sort = 'updated_at', int $limit = 25): CursorPaginator
    {
        abort_unless($actor->is_agent, 403);

        return $this->tickets->forWorkspace($actor->workspace_id, $filters, $sort, $limit);
    }
}
