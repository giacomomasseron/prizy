<?php

declare(strict_types=1);

namespace App\Rules;

use App\Services\SignupHost;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A workspace slug becomes a hostname (acme → acme.prizy.dev), so it must be a
 * DNS label the tenant finder can match: lowercase, because Request::getHost()
 * lowercases the host before the lookup; no "--", which also keeps out
 * punycode ("xn--") lookalikes; and none of the names the platform keeps for
 * its own hosts.
 */
final class WorkspaceSlug implements ValidationRule
{
    /** @var list<string> */
    public const RESERVED = [
        'abuse', 'account', 'accounts', 'admin', 'administrator', 'api', 'app', 'assets', 'auth',
        'autoconfig', 'autodiscover', 'billing', 'blog', 'cdn', 'dashboard', 'demo', 'dev', 'docs',
        'email', 'files', 'ftp', 'health', 'help', 'hostmaster', 'imap', 'internal', 'login', 'logout',
        'mail', 'media', 'pop', 'pop3', 'postmaster', 'prizy', 'register', 'reverb', 'root', 'security',
        'signup', 'smtp', 'socket', 'staging', 'static', 'status', 'support', 'system', 'test', 'webmail',
        'webmaster', 'www',
    ];

    /** What each problem() answer tells the person typing the slug. */
    public const MESSAGES = [
        'invalid'  => 'Use 3–63 lowercase letters, numbers and hyphens, starting and ending with a letter or number.',
        'reserved' => 'That address is reserved.',
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $problem = self::problem($value);

        if ($problem !== null) {
            $fail(self::MESSAGES[$problem]);
        }
    }

    /**
     * Why $value can't be a slug, or null when it can (taken or not: that is
     * the database's to say). Also asked on its own by the sign-up page's
     * live check.
     *
     * @return 'invalid'|'reserved'|null
     */
    public static function problem(mixed $value): ?string
    {
        if (! is_string($value)
            // D: "$" must not match before a trailing newline.
            || preg_match('/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/D', $value) !== 1
            || str_contains($value, '--')) {
            return 'invalid';
        }

        if (in_array($value, self::RESERVED, true) || self::isSignupHostLabel($value)) {
            return 'reserved';
        }

        return null;
    }

    /** APP_SIGNUP_HOST may be any subdomain (join.example.com), not only "signup". */
    private static function isSignupHostLabel(string $value): bool
    {
        $base = strtolower((string) config('app.base_domain'));

        return $base !== '' && "{$value}.{$base}" === SignupHost::host();
    }
}
