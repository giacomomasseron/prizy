<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * A one-time, two-minute link on a workspace's own host that logs a user in
 * there. Sign-up happens on the sign-up host, whose session the workspace
 * never sees (cookies are per host), so this is how the owner arrives logged
 * in.
 *
 * It is a magic link (ConsumeMagicLink pulls the nonce, so it works once)
 * signed RELATIVE to the host: the workspace URL is not the host it is
 * generated on. Swapping the host buys nothing, because the user is looked up
 * inside the workspace the link is opened on.
 */
final class LoginHandoff
{
    public const TTL_MINUTES = 2;

    public static function url(User $user, Workspace $workspace): string
    {
        $nonce = Str::random(40);
        $expires = now()->addMinutes(self::TTL_MINUTES);

        Cache::put("magic-link:{$nonce}", $user->id, $expires);

        $path = URL::temporarySignedRoute('auth.handoff', $expires, ['nonce' => $nonce, 'user' => $user->id], absolute: false);

        return WorkspaceUrl::for($workspace).$path;
    }
}
