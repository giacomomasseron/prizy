<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\Ticket;
use App\Repositories\TicketRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Records a customer's CSAT rating from a signed email link.
 *
 * Deliberate exception to the gate-in-use-case pattern: there is NO actor —
 * customers are contacts with no login. The temporary signed URL validated in
 * CsatController is the entire authorization (the signature covers host,
 * ticket, rating, and expiry). Ratings are last-write-wins while the link is
 * valid; csat_responded_at records only the FIRST response.
 */
final class RecordCsatResponse
{
    private const RATINGS = ['up' => 'thumbs_up', 'down' => 'thumbs_down'];

    public function __construct(private readonly TicketRepository $tickets) {}

    public function handle(string $ticketId, string $rating): Ticket
    {
        $ticket = $this->tickets->find($ticketId);
        if ($ticket === null) {
            throw (new ModelNotFoundException)->setModel(Ticket::class, [$ticketId]);
        }

        $ticket->csat_rating = self::RATINGS[$rating];
        if ($ticket->csat_responded_at === null) {
            $ticket->csat_responded_at = now();
        }
        $ticket->save();

        return $ticket;
    }
}
