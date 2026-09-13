<?php

declare(strict_types=1);

use App\Services\KbLocales;

it('lists six languages with English first as the source', function (): void {
    expect(KbLocales::CODES)->toBe(['en', 'fr', 'de', 'es', 'it', 'pt-BR']);
    expect(KbLocales::SOURCE)->toBe('en');
    expect(KbLocales::name('pt-BR'))->toBe('Portuguese (Brazil)');
    expect(KbLocales::name('zz'))->toBeNull();
});

it('excludes the source language from the translatable set', function (): void {
    expect(KbLocales::TRANSLATABLE)->toBe(['fr', 'de', 'es', 'it', 'pt-BR']);
    expect(KbLocales::TRANSLATABLE)->not->toContain('en');
});

it('keeps its own four constants consistent with each other', function (): void {
    // CODES, NAMES, TRANSLATABLE and REGCONFIGS each restate the language list.
    // Adding a language and forgetting one of them is the obvious failure mode;
    // this is the guard against it.
    expect(array_keys(KbLocales::NAMES))->toBe(KbLocales::CODES);
    expect(array_keys(KbLocales::REGCONFIGS))->toBe(KbLocales::CODES);
    expect(KbLocales::TRANSLATABLE)->toBe(array_values(array_diff(KbLocales::CODES, [KbLocales::SOURCE])));
});

it('resolves an unsupported or missing locale to the source', function (): void {
    expect(KbLocales::resolve('fr'))->toBe('fr');
    expect(KbLocales::resolve('zz'))->toBe('en');
    expect(KbLocales::resolve(null))->toBe('en');
    expect(KbLocales::resolve(''))->toBe('en');
    expect(KbLocales::isSupported('pt-BR'))->toBeTrue();
    expect(KbLocales::isSupported('pt'))->toBeFalse();
});

it('maps every supported locale to a Postgres text-search configuration', function (): void {
    foreach (KbLocales::CODES as $code) {
        expect(KbLocales::regconfig($code))->not->toBe('');
    }
    expect(KbLocales::regconfig('fr'))->toBe('french');
    expect(KbLocales::regconfig('pt-BR'))->toBe('portuguese');
    expect(KbLocales::regconfig('zz'))->toBe('simple');
});

it('reads a supported language out of an Accept-Language header, else null', function (): void {
    expect(KbLocales::fromAcceptLanguage('fr-FR,fr;q=0.9,en;q=0.8'))->toBe('fr');
    expect(KbLocales::fromAcceptLanguage('pt-BR,pt;q=0.9'))->toBe('pt-BR');
    // English is supported and IS the source — returning it is correct and harmless.
    expect(KbLocales::fromAcceptLanguage('en-GB,en;q=0.9'))->toBe('en');
    expect(KbLocales::fromAcceptLanguage('ja,ko;q=0.8'))->toBeNull();
    expect(KbLocales::fromAcceptLanguage(null))->toBeNull();
    expect(KbLocales::fromAcceptLanguage(''))->toBeNull();
});

it('keeps the regconfig map in step with the migration that mirrors it in SQL', function (): void {
    // The generated column cannot call PHP, so the CASE in the migration duplicates
    // this map. Drift silently indexes a language under the wrong stemmer, which
    // looks like "search is just bad" rather than like a bug.
    $sql = file_get_contents(__DIR__.'/../../database/migrations/2026_09_13_000001_add_search_to_kb_article_translations.php');

    foreach (KbLocales::TRANSLATABLE as $code) {
        $config = KbLocales::regconfig($code);
        // Exactly twice: once in the title vector's CASE, once in the body's.
        expect(substr_count($sql, "WHEN '{$code}' THEN '{$config}'::regconfig"))->toBe(2);
    }
});

it("keeps the migration's two locale CASE blocks identical to each other", function (): void {
    // The generated column maps locale -> regconfig twice, once for the title
    // vector and once for the body vector. If the two ever diverge, a title
    // would index under a different stemmer than its own body, silently. The
    // per-locale assertions pass as long as ONE copy is right, so this is the
    // assertion that actually pins them together.
    $sql = file_get_contents(__DIR__.'/../../database/migrations/2026_09_13_000001_add_search_to_kb_article_translations.php');

    preg_match_all('/CASE locale.*?END/s', $sql, $m);
    expect($m[0])->toHaveCount(2);

    $normalise = fn (string $block): string => (string) preg_replace('/\s+/', ' ', trim($block));
    expect($normalise($m[0][0]))->toBe($normalise($m[0][1]));
});
