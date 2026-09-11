<?php

declare(strict_types=1);

namespace App\UseCases\Portal;

use App\Models\Contact;
use App\Models\Ticket;
use App\Repositories\PortalTicketRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;

/**
 * A contact rates their own resolved request from the portal. The authed,
 * own-only sibling of the actor-less signed-email RecordCsatResponse — the two
 * never collide (portal = auth:contact + own-only; email = signed URL +
 * actor-less). Back-fills csat_requested_at so a self-solved ticket (HC-2 sets
 * resolved_at without it) stays consistent with the email path's invariant;
 * this does NOT change the reporting denominator (csatRate divides by
 * csat_responded_at).
 */
final class RatePortalTicket
{
    private const RATINGS = ['up' => 'thumbs_up', 'down' => 'thumbs_down'];

    public function __construct(private readonly PortalTicketRepository $tickets) {}

    public function handle(Contact $actor, string $ticketId, string $vote): void
    {
        $ticket = $this->tickets->findOwn($actor, $ticketId);
        if ($ticket === null) {
            throw (new ModelNotFoundException)->setModel(Ticket::class, [$ticketId]);
        }

        abort_unless(in_array($ticket->status, ['solved', 'closed'], true), 403);

        if (! isset(self::RATINGS[$vote])) {
            throw ValidationException::withMessages(['vote' => ['Invalid rating.']]);
        }

        $ticket->csat_rating = self::RATINGS[$vote];
        if ($ticket->csat_responded_at === null) {
            $ticket->csat_responded_at = now();
        }
        if ($ticket->csat_requested_at === null) {
            $ticket->csat_requested_at = now();
        }
        $ticket->save();
    }
}
