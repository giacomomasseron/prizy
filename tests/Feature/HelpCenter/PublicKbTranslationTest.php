<?php

declare(strict_types=1);

use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

afterEach(fn () => Workspace::forgetCurrent());

function helpSeedTranslation(string $articleId, string $locale, array $over = []): void
{
    DB::table('kb_article_translations')->insert(array_merge([
        'id' => (string) Str::uuid(), 'article_id' => $articleId, 'locale' => $locale,
        'title' => 'Ce qui se passe ensuite', 'body' => "Votre demande est bien reçue.\n\nNous répondons vite.",
        'status' => 'published', 'created_at' => now(), 'updated_at' => now(),
    ], $over));
}

it('renders the published translation and its own updated date', function (): void {
    [$ws, $user] = helpKbWorld();
    $art = helpKbArticle(helpKbSection(helpKbCategory($ws)), $user, ['title' => 'What happens next', 'updated_at' => now()->subYear()]);
    helpSeedTranslation($art->id, 'fr', ['updated_at' => now()]);

    $res = $this->get('/help/getting-started/basics/create-your-first-project?lang=fr')->assertOk();
    $res->assertSee('Ce qui se passe ensuite');
    $res->assertSee('Votre demande est bien reçue.');
    $res->assertDontSee('What happens next');
    // The translation's own date, not the source article's.
    $res->assertSee(now()->format('M j, Y'));
    $res->assertDontSee(now()->subYear()->format('M j, Y'));
    $res->assertDontSee('showing the English version', false);
});

it('marks the translated heading and article with the page language (WCAG 3.1.2), but not on a fallback', function (): void {
    [$ws, $user] = helpKbWorld();
    $art = helpKbArticle(helpKbSection(helpKbCategory($ws)), $user, ['title' => 'What happens next']);
    helpSeedTranslation($art->id, 'fr');

    // A genuine translation: the passage differs from the page chrome's
    // English, so the heading and body are marked with the target locale.
    $translated = $this->get('/help/getting-started/basics/create-your-first-project?lang=fr')->assertOk();
    $translated->assertSee('<h1 lang="fr"', false);
    $translated->assertSee('<article class="kb" lang="fr">', false);

    // A fallback: the content actually IS English, so marking it otherwise
    // would mislabel it. No translation exists for `de`, so this renders the
    // English body — no lang="de" anywhere in the heading or article.
    $fallback = $this->get('/help/getting-started/basics/create-your-first-project?lang=de')->assertOk();
    $fallback->assertDontSee('lang="de"', false);
});

it('falls back to English with a notice when no translation exists', function (): void {
    [$ws, $user] = helpKbWorld();
    helpKbArticle(helpKbSection(helpKbCategory($ws)), $user, ['title' => 'What happens next']);

    $res = $this->get('/help/getting-started/basics/create-your-first-project?lang=fr')->assertOk();
    $res->assertSee('What happens next');
    $res->assertSee("This article isn't available in French yet — showing the English version.", false);
    $res->assertSee('Switch to English');
});

it('treats a draft or archived translation exactly like a missing one', function (): void {
    [$ws, $user] = helpKbWorld();
    $art = helpKbArticle(helpKbSection(helpKbCategory($ws)), $user, ['title' => 'What happens next']);
    helpSeedTranslation($art->id, 'fr', ['status' => 'draft']);
    helpSeedTranslation($art->id, 'de', ['status' => 'archived', 'title' => 'Nicht sichtbar']);

    $this->get('/help/getting-started/basics/create-your-first-project?lang=fr')->assertOk()
        ->assertSee('What happens next')->assertSee('showing the English version', false);
    $this->get('/help/getting-started/basics/create-your-first-project?lang=de')->assertOk()
        ->assertDontSee('Nicht sichtbar');
});

it('serves English for an absent or unsupported lang, with no notice and no error', function (): void {
    [$ws, $user] = helpKbWorld();
    $art = helpKbArticle(helpKbSection(helpKbCategory($ws)), $user, ['title' => 'What happens next']);
    helpSeedTranslation($art->id, 'fr');

    foreach (['', '?lang=', '?lang=zz', '?lang=en'] as $suffix) {
        $this->get("/help/getting-started/basics/create-your-first-project{$suffix}")->assertOk()
            ->assertSee('What happens next')
            ->assertDontSee('showing the English version', false);
    }
});

it('survives a lang parameter sent as an array instead of a string', function (): void {
    // (string) on an array is a 500 — HC-2 shipped exactly this bug once.
    [$ws, $user] = helpKbWorld();
    helpKbArticle(helpKbSection(helpKbCategory($ws)), $user, ['title' => 'What happens next']);

    $this->get('/help/getting-started/basics/create-your-first-project?lang[]=fr')->assertOk()
        ->assertSee('What happens next');
});

it('uses Accept-Language only when no lang parameter is present', function (): void {
    [$ws, $user] = helpKbWorld();
    $art = helpKbArticle(helpKbSection(helpKbCategory($ws)), $user, ['title' => 'What happens next']);
    helpSeedTranslation($art->id, 'fr');

    $this->withHeader('Accept-Language', 'fr-FR,fr;q=0.9')
        ->get('/help/getting-started/basics/create-your-first-project')->assertOk()
        ->assertSee('Ce qui se passe ensuite');

    // An explicit choice always wins over the header.
    $this->withHeader('Accept-Language', 'fr-FR,fr;q=0.9')
        ->get('/help/getting-started/basics/create-your-first-project?lang=en')->assertOk()
        ->assertSee('What happens next');
});

it('carries the chosen language through knowledge-base links', function (): void {
    [$ws, $user] = helpKbWorld();
    $art = helpKbArticle(helpKbSection(helpKbCategory($ws)), $user);
    helpSeedTranslation($art->id, 'fr');

    $res = $this->get('/help/getting-started/basics/create-your-first-project?lang=fr')->assertOk();
    $res->assertSee('/help/getting-started?lang=fr', false);
    // English needs no parameter — the canonical URL stays clean.
    $this->get('/help/getting-started/basics/create-your-first-project')->assertOk()
        ->assertDontSee('?lang=en', false);
});

it('shows the language switcher with every supported language', function (): void {
    helpKbWorld();
    $res = $this->get('/help')->assertOk();
    $res->assertSee('Read this help center in');
    foreach (['English', 'French', 'German', 'Spanish', 'Italian', 'Portuguese (Brazil)'] as $name) {
        $res->assertSee($name);
    }
});

it('renders the switcher on knowledge-base pages but not on the portal', function (): void {
    helpKbWorld();

    // The gate gets it in both directions: shown where helpRoute is set,
    // hidden where the portal controller passes no locale at all.
    $this->get('/help')->assertOk()->assertSee('Read this help center in');
    $this->get('/help/login')->assertOk()->assertDontSee('Read this help center in');
});

it('marks which languages this article is actually available in', function (): void {
    [$ws, $user] = helpKbWorld();
    $art = helpKbArticle(helpKbSection(helpKbCategory($ws)), $user);
    helpSeedTranslation($art->id, 'fr');

    // On an article page the switcher says which languages exist for THIS article.
    $this->get('/help/getting-started/basics/create-your-first-project')->assertOk()
        ->assertSee('English only');
    // Elsewhere there is no per-article claim to make.
    $this->get('/help')->assertOk()->assertDontSee('English only');
});

it('uses translated titles in topic and home listings, and English where none exists', function (): void {
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    $translated = helpKbArticle($sec, $user, ['title' => 'Translated one', 'slug' => 'translated-one']);
    helpKbArticle($sec, $user, ['title' => 'Untranslated one', 'slug' => 'untranslated-one']);
    helpSeedTranslation($translated->id, 'fr', ['title' => 'Traduit']);

    $topic = $this->get('/help/getting-started?lang=fr')->assertOk();
    $topic->assertSee('Traduit');
    $topic->assertDontSee('Translated one');
    // No translation for the second article — its English title still shows.
    $topic->assertSee('Untranslated one');

    // The same two articles also drive the home page's suggestion chips —
    // topArticles() pulls every published article in the workspace (ordered
    // by views_count, limit 4), not just this category, so with only these
    // two published articles both land well inside that limit.
    $home = $this->get('/help?lang=fr')->assertOk();
    $home->assertSee('Traduit');
    $home->assertDontSee('Translated one');
    $home->assertSee('Untranslated one');
});

it('keeps category names in English even when a language is selected', function (): void {
    [$ws, $user] = helpKbWorld();
    helpKbArticle(helpKbSection(helpKbCategory($ws, 'getting-started', ['name' => 'Getting started'])), $user);

    $this->get('/help?lang=fr')->assertOk()->assertSee('Getting started');
});

it('translates related-article titles too, leaving untranslated ones in English', function (): void {
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    helpKbArticle($sec, $user, ['title' => 'Main article', 'slug' => 'main-article']);
    $translatedRelated = helpKbArticle($sec, $user, ['title' => 'Related one', 'slug' => 'related-one']);
    helpKbArticle($sec, $user, ['title' => 'Related two', 'slug' => 'related-two']);
    helpSeedTranslation($translatedRelated->id, 'fr', ['title' => 'Lié un']);

    $res = $this->get('/help/getting-started/basics/main-article?lang=fr')->assertOk();
    $res->assertSee('Lié un');
    $res->assertDontSee('Related one');
    // No translation for the other related article — its English title still shows.
    $res->assertSee('Related two');
});
