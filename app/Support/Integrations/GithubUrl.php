<?php

declare(strict_types=1);

namespace App\Support\Integrations;

final class GithubUrl
{
    /** @return array{repo: string, number: int}|null */
    public static function parse(string $url): ?array
    {
        if (preg_match('~^https://github\.com/([^/\s]+/[^/\s]+)/pull/(\d+)(?:[/?#].*)?$~', trim($url), $m) !== 1) {
            return null;
        }

        return ['repo' => $m[1], 'number' => (int) $m[2]];
    }
}
