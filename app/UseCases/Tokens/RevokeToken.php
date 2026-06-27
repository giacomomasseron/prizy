<?php

declare(strict_types=1);

namespace App\UseCases\Tokens;

use App\Models\PersonalAccessToken;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Revokes (deletes) a personal access token.
 *
 * Scoped to the owning user — a user cannot revoke another user's tokens.
 * Throws ModelNotFoundException (404) if the token is not found or belongs to a different user.
 */
final class RevokeToken
{
    public function handle(User $user, string $tokenId): void
    {
        $token = PersonalAccessToken::where('id', $tokenId)
            ->where('user_id', $user->id)
            ->first();

        if ($token === null) {
            throw new ModelNotFoundException("Token [{$tokenId}] not found for user [{$user->id}].");
        }

        $token->delete();
    }
}
