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
            'relatedArticles' => $this->relatedArticlesFor($ticket->subject),
            'hasEscalation' => $ticket->issueTicketLinks()->exists(),
        ];
    }

    /**
     * KbRepository::search() feeds websearch_to_tsquery() directly, whose
     * default (unquoted, no "OR") semantics AND every term together — right
     * for a user-typed search-box query, wrong for "related articles": a
     * ticket subject is a whole sentence, and requiring EVERY one of its
     * words (including incidental ones the article body would never contain)
     * to appear in a candidate article would make matches vanishingly rare.
     * OR-joining the subject's words instead finds anything sharing at least
     * one topic word with the subject; websearch_to_tsquery understands the
     * literal " OR " keyword between terms.
     *
     * @return Collection<int, object>
     */
    private function relatedArticlesFor(string $subject): Collection
    {
        $words = preg_split('/[^\p{L}\p{N}]+/u', $subject, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        if ($words === []) {
            return new Collection;
        }

        return $this->kb->search(implode(' OR ', $words), 3);
    }
}
