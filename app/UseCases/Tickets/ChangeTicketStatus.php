<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\Ticket;
use App\Models\User;
use App\Repositories\TicketRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class ChangeTicketStatus
{
    /** @var list<string> */
    private const CLOSED_STATUSES = ['solved', 'closed'];

    public function __construct(private readonly TicketRepository $tickets) {}

    public function handle(User $actor, string $ticketId, string $status): Ticket
    {
        abort_unless($actor->is_agent, 403);

        $ticket = $this->tickets->find($ticketId);
        if ($ticket === null) {
            throw (new ModelNotFoundException)->setModel(Ticket::class, [$ticketId]);
        }

        $ticket->status = $status;

        $isClosed = in_array($status, self::CLOSED_STATUSES, true);
        if ($isClosed && $ticket->resolved_at === null) {
            $ticket->resolved_at = now();
        } elseif (! $isClosed) {
            $ticket->resolved_at = null;
        }

        $ticket->save();

        return $ticket; // relations eager-loaded by find() → TicketResource has no N+1
    }
}
