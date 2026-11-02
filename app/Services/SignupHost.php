<?php

declare(strict_types=1);

namespace App\Services;

/**
 * The host sign-up and "find your workspace" live on: APP_SIGNUP_HOST on the
 * cloud (signup.prizy.dev, whose bare domain is the marketing website), else
 * APP_BASE_DOMAIN itself. It never resolves to a workspace.
 */
final class SignupHost
{
    public static function host(): string
    {
        return strtolower((string) (config('app.signup_host') ?: config('app.base_domain')));
    }

    public static function url(string $path = ''): string
    {
        return WorkspaceUrl::origin(self::host()).$path;
    }
}
