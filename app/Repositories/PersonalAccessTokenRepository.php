<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\PersonalAccessToken;

/**
 * Data-access helpers for PersonalAccessToken.
 *
 * personal_access_tokens has no workspace_id and no RLS — every query here is
 * intentionally global (no WorkspaceScope to bypass). Per-workspace enforcement
 * is done in the TokenGuard after the user is loaded via the scoped User query.
 */
final class PersonalAccessTokenRepository
{
    /**
     * Find a token by the SHA-256 hash of the raw Bearer value.
     */
    public function findByTokenHash(string $hash): ?PersonalAccessToken
    {
        return PersonalAccessToken::where('token_hash', $hash)->first();
    }
}
