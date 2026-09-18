<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\Ticket;
use App\Models\User;
use App\Notifications\CsatRequest;
use App\Repositories\TicketRepository;
use App\Services\HelpdeskAccess;
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
        HelpdeskAccess::gate($actor);

        $ticket = $this->tickets->find($ticketId);
        if ($ticket === null) {
            throw (new ModelNotFoundException)->setModel(Ticket::class, [$ticketId]);
        }

        $ticket->status = $status;

        $isClosed = in_array($status, self::CLOSED_STATUSES, true);
        $wasFirstResolve = $isClosed && $ticket->resolved_at === null;
        if ($wasFirstResolve) {
            $ticket->resolved_at = now();
        } elseif (! $isClosed) {
            $ticket->resolved_at = null;
        }

        $ticket->save();

        if ($wasFirstResolve) {
            $this->sendCsatRequest($ticket);
        }

        return $ticket; // relations eager-loaded by find() → TicketResource has no N+1
    }

    /**
     * Emails the requester two signed one-click rating links, at most once per
     * ticket. Runs AFTER handle() has already saved the status/resolved_at
     * change — persist-then-notify (InviteMember/RequestMagicLink precedent)
     * — so a mail-transport failure never rolls back a legitimate resolution
     * and never wedges a ticket with a bad contact email into permanently
     * unresolvable. The guard is csat_requested_at — NOT resolved_at, which
     * reopening clears — so reopen→re-resolve cycles never re-send.
     * csat_requested_at is stamped and saved HERE (it no longer rides
     * handle()'s save), and only after a successful notify(): a mail failure
     * still surfaces as a 500 (no try/catch), but the resolution itself is
     * already durable, and a retry PATCH succeeds without re-sending since
     * resolved_at is already set (wasFirstResolve requires resolved_at to
     * still be null).
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
        $ticket->save();
    }
}
