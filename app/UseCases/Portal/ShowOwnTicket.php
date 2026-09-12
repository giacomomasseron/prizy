<?php

declare(strict_types=1);

namespace App\UseCases\Portal;

use App\Models\Contact;
use App\Models\Ticket;
use App\Repositories\KbRepository;
use App\Repositories\PortalTicketRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

final class ShowOwnTicket
{
    public function __construct(
        private readonly PortalTicketRepository $tickets,
        private readonly KbRepository $kb,
    ) {}

    /** @return array{ticket: Ticket, conversation: list<array<string, mixed>>, statusLabel: string, relatedArticles: Collection<int, object>, hasEscalation: bool} */
    public function handle(Contact $actor, string $ticketId): array
    {
        $ticket = $this->tickets->findOwn($actor, $ticketId);
        if ($ticket === null) {
            throw (new ModelNotFoundException)->setModel(Ticket::class, [$ticketId]);
        }

        $this->tickets->markSeen($ticket);

        return [
            'ticket' => $ticket,
            'conversation' => $this->tickets->conversation($ticket),
            'statusLabel' => PortalTicketRepository::STATUS_LABELS[$ticket->status] ?? $ticket->status,
            'relatedArticles' => $this->kb->relatedByText($ticket->subject, 3),
            'hasEscalation' => $ticket->issueTicketLinks()->exists(),
        ];
    }
}
