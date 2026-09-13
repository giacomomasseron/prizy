<?php

declare(strict_types=1);

namespace App\Services;

/**
 * URL building for the public help center, with the reader's language carried
 * along. Called from Blade as a fully-qualified static — the idiom the layout
 * already uses for \App\Models\Workspace::current() — which is legal because
 * views sit outside deptrac's paths: [./app]. No class under app/ depends on it.
 *
 * Knowledge-base routes only (help.home / help.topic / help.article /
 * help.search). Portal routes deliberately do NOT carry a locale: HC-6 does not
 * translate the interface, so a ?lang on the ticket pages would promise
 * something they do not deliver.
 */
final class HelpLocale
{
    /**
     * English is the canonical default and never appears in the query string, so
     * ordinary URLs stay exactly as they were before translations existed.
     *
     * @param  array<int|string, mixed>  $params
     */
    public static function url(string $routeName, array $params = [], string $lang = KbLocales::SOURCE): string
    {
        if ($lang !== KbLocales::SOURCE && KbLocales::isSupported($lang)) {
            $params['lang'] = $lang;
        }

        return route($routeName, $params);
    }
}
