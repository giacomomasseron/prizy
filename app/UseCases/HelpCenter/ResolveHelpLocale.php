<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Services\KbLocales;

/**
 * The public help center's locale decision, in one place.
 *
 * It is a use case rather than a controller helper because deptrac allows
 * Controller -> UseCase only: a controller calling KbLocales directly would be a
 * Controller -> Service edge (the HC-5 RESERVED_HELP_SLUGS ruling).
 */
final class ResolveHelpLocale
{
    /**
     * An explicit ?lang always wins, even when unsupported — it resolves to the
     * source rather than deferring to the header, because a reader who asked for
     * a specific language is better served by English than by a third language
     * they never chose. Accept-Language is consulted only when the parameter is
     * absent, and never rewrites the URL.
     */
    public function handle(?string $requested, ?string $acceptLanguage = null): string
    {
        if ($requested !== null && $requested !== '') {
            return KbLocales::resolve($requested);
        }

        return KbLocales::resolve(KbLocales::fromAcceptLanguage($acceptLanguage));
    }
}
