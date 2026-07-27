<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Repositories\ContactRepository;
use App\Repositories\TicketRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class CreateTicket
{
    public function __construct(
        private readonly TicketRepository $tickets,
        private readonly ContactRepository $contacts,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Ticket
    {
        abort_unless($actor->is_agent, 403);

        $contact = $this->contacts->find((string) $data['requester_id']);
        if ($contact === null) {
            throw ValidationException::withMessages(['requester_id' => ['The selected requester is invalid.']]);
        }

        $ticket = DB::transaction(function () use ($contact, $data): Ticket {
            $ticket = $this->tickets->create([
                'id' => (string) Str::uuid(),
                'requester_id' => $contact->id,
                'assignee_id' => null,
                'subject' => $data['subject'],
                'status' => 'new',
                'priority' => $data['priority'],
                'channel' => $data['channel'],
            ]);

            TicketMessage::forceCreate([
                'id' => (string) Str::uuid(),
                'ticket_id' => $ticket->id,
                'sender_type' => 'contact',
                'sender_user_id' => null,
                'sender_contact_id' => $contact->id,
                'body' => $data['body'],
                'is_internal' => false,
                'channel' => $ticket->channel,
            ]);

            return $ticket;
        });

        return $this->tickets->find($ticket->id) ?? $ticket; // reload with eager-loads for TicketResource
    }
}
