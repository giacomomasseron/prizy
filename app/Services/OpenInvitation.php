<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Finds the invitation behind a raw token, and refuses one that can't be used.
 *
 * The accept page and the accept request share it, so the page never offers a
 * form the request would turn down.
 *
 * Runs with no current workspace: the invitee has no session yet. WorkspaceScope
 * is a no-op then and the RLS policy is permissive when the GUC is unset, so the
 * token alone reaches the row, whichever workspace it belongs to.
 */
final class OpenInvitation
{
    /**
     * @param  string  $rawToken  The 40-char token from the email link; only its hash is stored.
     *
     * @throws ValidationException naming why the invitation can't be used
     */
    public function find(string $rawToken): Invitation
    {
        $invitation = Invitation::withoutGlobalScopes()
            ->where('token_hash', hash('sha256', $rawToken))
            ->first();

        if ($invitation === null) {
            throw $this->refused('The invitation token is invalid.');
        }

        if ($invitation->accepted_at !== null) {
            throw $this->refused('This invitation has already been accepted.');
        }

        if ($invitation->expires_at->isPast()) {
            throw $this->refused('This invitation has expired.');
        }

        // Not found once deleted: the workspace is closed at once, and its
        // invitations go only when PurgeWorkspace erases it.
        if ($invitation->workspace === null) {
            throw $this->refused('The invitation token is invalid.');
        }

        // Sent before they joined some other way. A removed member doesn't
        // count: the default scope leaves them out, and they may come back.
        $isMember = User::where('workspace_id', $invitation->workspace_id)
            ->where('email', $invitation->email)
            ->exists();

        if ($isMember) {
            throw $this->refused('You are already a member of this workspace. Sign in instead.');
        }

        return $invitation;
    }

    private function refused(string $reason): ValidationException
    {
        return ValidationException::withMessages(['token' => [$reason]]);
    }
}
