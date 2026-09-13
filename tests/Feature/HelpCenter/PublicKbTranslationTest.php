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
