<?php

declare(strict_types=1);

namespace App\UseCases\Tokens;

use App\Models\PersonalAccessToken;
use App\Models\User;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Revokes (deletes) a personal access token.
 *
 * Scoped to the owning user — a user cannot revoke another user's tokens.
 * Throws ModelNotFoundException (404) if the token is not found or belongs to a different user.
 *
 * @method static void run(User $user, string $tokenId)
 */
final class RevokeToken extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $user, string $tokenId): void
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
