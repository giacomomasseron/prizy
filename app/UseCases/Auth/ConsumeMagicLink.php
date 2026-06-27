<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/**
 * Validates a magic-link nonce and logs the user in.
 *
 * Cache::pull() is an atomic get-and-delete: it reads the stored user ID and
 * removes the key in one operation. A second call with the same nonce returns
 * null, enforcing single-use without any extra locking.
 *
 * This use case is invoked from the landlord consume route — no tenant context
 * is required. User::find() works globally because WorkspaceScope adds no
 * WHERE clause when no workspace is current, and Postgres RLS is permissive
 * when app.current_workspace_id is unset.
 */
final class ConsumeMagicLink
{
    /**
     * @throws RuntimeException when the nonce is invalid, expired, already used,
     *                          or the user ID in the cache does not match the URL parameter.
     */
    public function handle(string $nonce, string $userId): User
    {
        // Atomic get-and-delete; returns null if key absent (expired or already pulled).
        $cachedUserId = Cache::pull("magic-link:{$nonce}");

        if ($cachedUserId === null || (string) $cachedUserId !== $userId) {
            throw new RuntimeException('Invalid, expired, or already-used magic link.');
        }

        $user = User::find($userId);

        if ($user === null) {
            throw new RuntimeException('User not found.');
        }

        Auth::login($user);

        return $user;
    }
}
