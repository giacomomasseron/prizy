<?php

declare(strict_types=1);

namespace App\UseCases\Portal;

use App\Models\Contact;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Repositories\PortalTicketRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class ReplyToOwnTicket
{
    /** Statuses a contact reply reopens (mirrors the "awaiting you"/"solved" vocabulary). */
    private const REOPENS = ['pending', 'on_hold', 'solved', 'closed'];

    public function __construct(private readonly PortalTicketRepository $tickets) {}

    public function handle(Contact $actor, string $ticketId, string $body): void
    {
        $ticket = $this->tickets->findOwn($actor, $ticketId);
        if ($ticket === null) {
            throw (new ModelNotFoundException)->setModel(Ticket::class, [$ticketId]);
        }

        $body = trim($body);
        if ($body === '') {
            throw ValidationException::withMessages(['body' => ['Reply cannot be empty.']]);
        }

        DB::transaction(function () use ($ticket, $actor, $body): void {
            TicketMessage::forceCreate([
                'id' => (string) Str::uuid(),
                'ticket_id' => $ticket->id,
                'sender_type' => 'contact',
                'sender_user_id' => null,
                'sender_contact_id' => $actor->id,
                'body' => $body,
                'is_internal' => false,
                'channel' => 'portal',
            ]);

            if (in_array($ticket->status, self::REOPENS, true)) {
                $ticket->status = 'open';
                $ticket->resolved_at = null;
            }
            // Bumps updated_at so both the desk and this portal list re-sort —
            // first_replied_at is an agent-side SLA stamp and is NEVER touched here.
            $ticket->touch();
        });
    }
}
