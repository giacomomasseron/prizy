<?php

declare(strict_types=1);

namespace App\UseCases\Portal;

use App\Models\Contact;
use App\Models\Ticket;
use App\Repositories\PortalTicketRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Self-service resolve. Deliberately sends NO CSAT notification (spec
 * decision 3): CsatRequest is only ever fired from the agent-side
 * ChangeTicketStatus use case, and this class never calls it or otherwise
 * touches Notification — a contact solving their own ticket is not the same
 * trust signal as an agent closing it out.
 */
final class SolveOwnTicket
{
    public function __construct(private readonly PortalTicketRepository $tickets) {}

    public function handle(Contact $actor, string $ticketId): void
    {
        $ticket = $this->tickets->findOwn($actor, $ticketId);
        if ($ticket === null) {
            throw (new ModelNotFoundException)->setModel(Ticket::class, [$ticketId]);
        }

        if (in_array($ticket->status, ['solved', 'closed'], true)) {
            return; // idempotent
        }

        $ticket->status = 'solved';
        $ticket->resolved_at = $ticket->resolved_at ?? now();
        $ticket->save();
    }
}
