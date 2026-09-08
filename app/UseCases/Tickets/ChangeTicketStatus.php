<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\Ticket;
use App\Models\User;
use App\Notifications\CsatRequest;
use App\Repositories\TicketRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;

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
            $this->sendCsatRequest($ticket);
        } elseif (! $isClosed) {
            $ticket->resolved_at = null;
        }

        $ticket->save();

        return $ticket; // relations eager-loaded by find() → TicketResource has no N+1
    }

    /**
     * Emails the requester two signed one-click rating links, at most once per
     * ticket. The guard is csat_requested_at — NOT resolved_at, which reopening
     * clears — so reopen→re-resolve cycles never re-send. Sent synchronously
     * (magic-link precedent); a mail failure surfaces as a 500 rather than
     * silently losing the request. csat_requested_at is persisted by handle()'s
     * save().
     */
    private function sendCsatRequest(Ticket $ticket): void
    {
        $email = $ticket->requester?->email;
        if ($ticket->csat_requested_at !== null || $email === null || $email === '') {
            return;
        }

        $expires = now()->addDays(14);

        Notification::route('mail', $email)->notify(new CsatRequest(
            URL::temporarySignedRoute('csat.respond', $expires, ['ticket' => $ticket->id, 'rating' => 'up']),
            URL::temporarySignedRoute('csat.respond', $expires, ['ticket' => $ticket->id, 'rating' => 'down']),
            $ticket->subject,
        ));

        $ticket->csat_requested_at = now();
    }
}
