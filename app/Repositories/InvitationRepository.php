<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Invitation;

/**
 * Data-access helpers for the Invitation entity.
 */
final class InvitationRepository
{
    /**
     * Find an invitation by the sha256 hash of its raw token.
     *
     * Called WITHOUT a current tenant (landlord context — the invitee is not
     * yet in a workspace session). WorkspaceScope is a no-op when no workspace
     * is current, and the Postgres RLS policy is permissive when the GUC is
     * NULL/empty, so the row is reachable from any workspace. We bypass the
     * global scope explicitly to make the intent clear.
     */
    public function findByTokenHash(string $tokenHash): ?Invitation
    {
        return Invitation::withoutGlobalScopes()->where('token_hash', $tokenHash)->first();
    }
}
