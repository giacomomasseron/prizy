<?php

declare(strict_types=1);

namespace App\Services;

/**
 * The languages the help center serves — a fixed allowlist in the KbPalette
 * idiom, not workspace-configurable. All six are left-to-right; right-to-left
 * layout is out of scope, which is why Arabic and Hebrew are absent.
 *
 * `en` is the SOURCE language: it lives on kb_articles itself and never has a
 * kb_article_translations row.
 */
final class KbLocales
{
    public const SOURCE = 'en';

    /** @var list<string> every supported code, in render order, source first */
    public const CODES = ['en', 'fr', 'de', 'es', 'it', 'pt-BR'];

    /** @var list<string> the codes that can hold a translation row — everything but the source */
    public const TRANSLATABLE = ['fr', 'de', 'es', 'it', 'pt-BR'];

    /** @var array<string, string> code => display name */
    public const NAMES = [
        'en' => 'English',
        'fr' => 'French',
        'de' => 'German',
        'es' => 'Spanish',
        'it' => 'Italian',
        'pt-BR' => 'Portuguese (Brazil)',
    ];

    /**
     * Postgres text-search configuration per locale. The generated column on
     * kb_article_translations mirrors this map in SQL because a generated
     * expression cannot call PHP; KbLocalesTest asserts the two never drift.
     *
     * @var array<string, string>
     */
    public const REGCONFIGS = [
        'en' => 'english',
        'fr' => 'french',
        'de' => 'german',
        'es' => 'spanish',
        'it' => 'italian',
        'pt-BR' => 'portuguese',
    ];

    public static function isSupported(string $code): bool
    {
        return array_key_exists($code, self::NAMES);
    }

    public static function name(string $code): ?string
    {
        return self::NAMES[$code] ?? null;
    }

    /** Anything without a dedicated stemmer indexes under 'simple' rather than the wrong language. */
    public static function regconfig(string $code): string
    {
        return self::REGCONFIGS[$code] ?? 'simple';
    }

    /** Resolve a requested locale to a supported one. Unrecognised input falls back to the source — never an error. */
    public static function resolve(?string $requested): string
    {
        return $requested !== null && self::isSupported($requested) ? $requested : self::SOURCE;
    }

    /** The first supported language named by an Accept-Language header, or null. Used ONLY when no ?lang is present. */
    public static function fromAcceptLanguage(?string $header): ?string
    {
        if ($header === null || trim($header) === '') {
            return null;
        }

        foreach (explode(',', $header) as $part) {
            $tag = trim(explode(';', $part)[0]);
            if ($tag === '') {
                continue;
            }
            // Exact match first ("pt-BR"), then the primary subtag ("fr-FR" -> "fr").
            if (self::isSupported($tag)) {
                return $tag;
            }
            $primary = explode('-', $tag)[0];
            if (self::isSupported($primary)) {
                return $primary;
            }
        }

        return null;
    }
}
