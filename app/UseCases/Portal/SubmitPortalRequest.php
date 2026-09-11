<?php

declare(strict_types=1);

namespace App\UseCases\Portal;

use App\Models\Contact;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Repositories\TicketRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * A contact opens a request from the portal. Own-by-construction: the requester
 * is the authenticated contact ($actor), never client input — there is no
 * requester field to spoof. This is the contact-actored analog of the
 * agent-gated CreateTicket (no is_agent gate; the `contact` guard is the gate).
 */
final class SubmitPortalRequest
{
    public function __construct(private readonly TicketRepository $tickets) {}

    /** @param array{subject: string, priority: string, body: string} $data */
    public function handle(Contact $actor, array $data): Ticket
    {
        return DB::transaction(function () use ($actor, $data): Ticket {
            $ticket = $this->tickets->create([
                'id' => (string) Str::uuid(),
                'requester_id' => $actor->id,
                'assignee_id' => null,
                'subject' => $data['subject'],
                'status' => 'new',
                'priority' => $data['priority'],
                'channel' => 'portal',
            ]);

            TicketMessage::forceCreate([
                'id' => (string) Str::uuid(),
                'ticket_id' => $ticket->id,
                'sender_type' => 'contact',
                'sender_user_id' => null,
                'sender_contact_id' => $actor->id,
                'body' => $data['body'],
                'is_internal' => false,
                'channel' => 'portal',
            ]);

            return $ticket;
        });
    }
}
