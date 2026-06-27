<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\User;

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
     * @return bool  true = verified (or already verified), false = user not found or hash mismatch
     */
    public function handle(string $id, string $hash): bool
    {
        $user = User::find($id);

        if ($user === null) {
            return false;
        }

        if (! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return false;
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        return true;
    }
}
