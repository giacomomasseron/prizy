<?php

declare(strict_types=1);

namespace App\Rules;

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

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)
            // D: "$" must not match before a trailing newline.
            || preg_match('/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/D', $value) !== 1
            || str_contains($value, '--')) {
            $fail('Use 3–63 lowercase letters, numbers and hyphens, starting and ending with a letter or number.');

            return;
        }

        if (in_array($value, self::RESERVED, true)) {
            $fail('That address is reserved.');
        }
    }
}
