<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\KbArticleVersion;

/**
 * What a knowledge-base article version changed, for the versions list and a
 * single version's page. Derived, never stored: the table has no column for it.
 */
final class KbVersionSummary
{
    public static function between(KbArticleVersion $version, ?KbArticleVersion $previous): string
    {
        if ($previous === null) {
            return 'Created';
        }
        $titleChanged = $version->title !== $previous->title;
        $bodyChanged = $version->body !== $previous->body;
        if ($titleChanged && $bodyChanged) {
            return 'Title and body';
        }
        if ($titleChanged) {
            return 'Title only';
        }

        return 'Body only';
    }
}
