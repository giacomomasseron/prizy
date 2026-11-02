<?php

declare(strict_types=1);

namespace App\UseCases\Portal;

use App\Models\Contact;
use App\Models\Ticket;
use App\Repositories\PortalTicketRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Self-service resolve. Deliberately sends NO CSAT notification (spec
 * decision 3): CsatRequest is only ever fired from the agent-side
 * ChangeTicketStatus use case, and this class never calls it or otherwise
 * touches Notification — a contact solving their own ticket is not the same
 * trust signal as an agent closing it out.
 *
 * @method static void run(Contact $actor, string $ticketId)
 */
final class SolveOwnTicket extends BaseUseCase implements UseCaseInterface
{
    private readonly PortalTicketRepository $tickets;

    public function handle(mixed ...$arguments): mixed
    {
        $this->tickets = app(PortalTicketRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    private function execute(Contact $actor, string $ticketId): void
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
