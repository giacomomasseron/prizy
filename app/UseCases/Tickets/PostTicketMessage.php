<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Repositories\TicketRepository;
use App\Services\HelpdeskAccess;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class PostTicketMessage
{
    public function __construct(private readonly TicketRepository $tickets) {}

    public function handle(User $actor, string $ticketId, string $body, bool $internal): TicketMessage
    {
        HelpdeskAccess::gate($actor);

        $ticket = $this->tickets->find($ticketId); // WorkspaceScope → cross-workspace id yields null
        if ($ticket === null) {
            throw (new ModelNotFoundException)->setModel(Ticket::class, [$ticketId]);
        }

        return DB::transaction(function () use ($actor, $ticket, $body, $internal): TicketMessage {
            $message = TicketMessage::forceCreate([
                'id' => (string) Str::uuid(),
                'ticket_id' => $ticket->id,
                'sender_type' => 'user',
                'sender_user_id' => $actor->id,
                'sender_contact_id' => null,
                'body' => $body,
                'is_internal' => $internal,
                'channel' => $ticket->channel,
            ]);

            if (! $internal && $ticket->first_replied_at === null) {
                $ticket->first_replied_at = now();
            }
            $ticket->touch(); // persists first_replied_at (if set) + bumps updated_at so the reply re-sorts the list

            $message->setRelation('senderUser', $actor); // resource reads sender.name without a re-query

            return $message;
        });
    }
}
