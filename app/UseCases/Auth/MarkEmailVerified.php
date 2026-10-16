<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\User;
use App\Models\Workspace;
use App\Services\LoginHandoff;
use App\Services\WorkspaceUrl;
use Illuminate\Support\Facades\DB;

/**
 * Verifies a user's email given their UUID and the expected SHA-1 hash of their email address.
 *
 * This use case is invoked from the landlord verify route — no tenant context is active.
 * WorkspaceScope does not add a WHERE clause when no workspace is current, and the
 * RLS policy is permissive when app.current_workspace_id GUC is null/empty, so
 * User::find() returns the row regardless of which workspace the user belongs to.
 */
final class MarkEmailVerified
{
    /**
     * Verifying the owner of a pending workspace also activates it: this link
     * is the confirmation SIGNUP_REQUIRES_ACTIVATION waits for.
     *
     * @return string|null  where to send the user, or null = user not found or hash mismatch
     */
    public function handle(string $id, string $hash): ?string
    {
        $user = User::find($id);

        if ($user === null) {
            return null;
        }

        if (! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return null;
        }

        $workspace = Workspace::find($user->workspace_id);

        if ($workspace === null) {
            return null;
        }

        $activated = DB::transaction(function () use ($user, $workspace): bool {
            if (! $user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
            }

            if ($workspace->activated_at === null && $user->admin_level === 'owner') {
                $workspace->forceFill(['activated_at' => now()])->save();

                return true;
            }

            return false;
        });

        // The click that activates the workspace logs its owner in there, as
        // sign-up does for a workspace that is live at once. Later clicks only
        // open it: the link lasts 24 hours and must not work as a password.
        return $activated
            ? LoginHandoff::url($user, $workspace)
            : WorkspaceUrl::for($workspace).'/';
    }
}
