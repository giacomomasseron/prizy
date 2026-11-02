<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Slug rules shared by the /help route constraint (routes/web.php) and the
 * authoring FormRequests: a category slug that shadowed one of RESERVED
 * would be unreachable behind the fixed /help/{search,requests,…} routes.
 */
final class KbSlug
{
    /** @var list<string> */
    public const RESERVED = ['search', 'articles', 'requests', 'new', 'login'];

    public const PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';

    public static function isReserved(string $slug): bool
    {
        return in_array($slug, self::RESERVED, true);
    }
}
