<?php

declare(strict_types=1);

namespace App\UseCases\Portal;

use App\Models\Contact;
use App\Models\Ticket;
use App\Repositories\KbRepository;
use App\Repositories\PortalTicketRepository;
use App\Services\TrackerAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

/**
 * @method array run(Contact $actor, string $ticketId)
 */
final class ShowOwnTicket extends BaseUseCase implements UseCaseInterface
{
    public function __construct(
        private readonly PortalTicketRepository $tickets,
        private readonly KbRepository $kb,
    ) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return array{ticket: Ticket, conversation: list<array<string, mixed>>, statusLabel: string, relatedArticles: Collection<int, object>, hasEscalation: bool} */
    private function execute(Contact $actor, string $ticketId): array
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
            // The "with our engineering team" card: only while the tracker runs.
            'hasEscalation' => TrackerAccess::enabledFor($ticket->workspace_id) && $ticket->issueTicketLinks()->exists(),
        ];
    }
}
