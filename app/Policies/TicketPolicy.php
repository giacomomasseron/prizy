<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

/**
 * Axis-1 (admin_level) + Axis-2 (is_agent) guard for Ticket operations.
 * Gate::before() handles the owner short-circuit before any method here runs.
 */
final class TicketPolicy
{
    /** Any authenticated workspace member may list tickets. */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /** Any same-workspace member may read a specific ticket. */
    public function view(User $user, Ticket $ticket): bool
    {
        return $user->workspace_id === $ticket->workspace_id;
    }

    /** Replying to a ticket requires agent capability, a non-viewer level, and same workspace. */
    public function reply(User $user, Ticket $ticket): bool
    {
        return $user->canWorkHelpdesk() && $user->admin_level !== 'viewer' && $user->workspace_id === $ticket->workspace_id;
    }

    /** Full ticket management (status, assignment, macros) requires the same as reply. */
    public function manage(User $user, Ticket $ticket): bool
    {
        return $user->canWorkHelpdesk() && $user->admin_level !== 'viewer' && $user->workspace_id === $ticket->workspace_id;
    }
}
