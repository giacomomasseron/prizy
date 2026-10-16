<?php

declare(strict_types=1);

namespace App\UseCases\Tickets;

use App\Models\Ticket;
use App\Models\User;
use App\Repositories\TicketRepository;
use App\Services\HelpdeskAccess;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;

final class AssignTicket
{
    public function __construct(private readonly TicketRepository $tickets) {}

    /** A null assignee unassigns the ticket. */
    public function handle(User $actor, string $ticketId, ?string $assigneeId): Ticket
    {
        HelpdeskAccess::gateWrite($actor);

        $ticket = $this->tickets->find($ticketId); // WorkspaceScope → cross-workspace id yields null
        if ($ticket === null) {
            throw (new ModelNotFoundException)->setModel(Ticket::class, [$ticketId]);
        }

        // A ticket goes to one agent who can work it (PRD: Assignee = single agent):
        // not a colleague without the agent capability, not a read-only viewer, and
        // not someone from another workspace (User is tenant-scoped, so find() is null).
        $assignee = null;
        if ($assigneeId !== null) {
            $assignee = User::find($assigneeId);
            if ($assignee === null || ! $assignee->canWriteHelpdesk()) {
                throw ValidationException::withMessages(['assignee_id' => ['The selected assignee is invalid.']]);
            }
        }

        // The stored id, not the input: the uuid rule lets an upper-case id through, and it
        // must still read as "no change" for the agent the ticket already has.
        $newAssigneeId = $assignee?->id;
        if ($ticket->assignee_id === $newAssigneeId) {
            return $ticket;
        }

        $ticket->assignee_id = $newAssigneeId;
        $ticket->save();
        $ticket->setRelation('assignee', $assignee); // find() eager-loaded the previous one

        return $ticket;
    }
}
