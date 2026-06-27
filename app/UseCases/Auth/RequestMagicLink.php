<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\User;
use App\Notifications\MagicLinkLogin;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * Issues a signed, single-use 15-minute magic-link and notifies the user.
 *
 * The nonce is stored in the cache under "magic-link:{nonce}" with a 15-minute
 * TTL. Cache::pull() in ConsumeMagicLink atomically reads and deletes it,
 * enforcing single-use semantics.
 *
 * If no user is found for the given email (within the current workspace scope),
 * this use case returns silently — it must NOT signal whether the address is
 * registered (anti-enumeration).
 */
final class RequestMagicLink
{
    public function handle(string $email): void
    {
        // WorkspaceScope is applied globally on User, so this query is already
        // constrained to the host-resolved workspace. Silently return if not found.
        $user = User::where('email', $email)->first();

        if ($user === null) {
            return;
        }

        $nonce = Str::random(40);

        Cache::put("magic-link:{$nonce}", $user->id, now()->addMinutes(15));

        $url = URL::temporarySignedRoute(
            'magic-link.consume',
            now()->addMinutes(15),
            ['nonce' => $nonce, 'user' => $user->id]
        );

        $user->notify(new MagicLinkLogin($url));
    }
}
