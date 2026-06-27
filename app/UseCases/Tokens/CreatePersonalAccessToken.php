<?php

declare(strict_types=1);

namespace App\UseCases\Tokens;

use App\Models\PersonalAccessToken;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Str;

/**
 * Issues a new personal access token for the given user.
 *
 * Returns the plaintext token exactly ONCE — it is never stored and cannot be
 * retrieved again. Only the SHA-256 hash is persisted in token_hash.
 */
final class CreatePersonalAccessToken
{
    /**
     * @return array{token: string, model: PersonalAccessToken}
     */
    public function handle(User $user, string $name, ?Carbon $expiresAt = null): array
    {
        $plain     = Str::random(40);
        $tokenHash = hash('sha256', $plain);

        $model = PersonalAccessToken::create([
            'id'         => (string) Str::uuid(),
            'user_id'    => $user->id,
            'name'       => $name,
            'token_hash' => $tokenHash,
            'expires_at' => $expiresAt,
        ]);

        return [
            'token' => $plain,
            'model' => $model,
        ];
    }
}
