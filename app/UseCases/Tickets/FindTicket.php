<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\Ticket;
use App\Models\User;
use App\Repositories\TicketRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class FindTicket
{
    public function __construct(private readonly TicketRepository $tickets) {}

    public function handle(User $actor, string $id): Ticket
    {
        abort_unless($actor->is_agent, 403);

        $ticket = $this->tickets->find($id); // WorkspaceScope → cross-workspace id yields null

        if ($ticket === null) {
            throw (new ModelNotFoundException)->setModel(Ticket::class, [$id]);
        }

        return $ticket;
    }
}
