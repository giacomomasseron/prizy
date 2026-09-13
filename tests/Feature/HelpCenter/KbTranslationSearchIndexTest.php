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

it('indexes each locale under its own stemmer, not English', function (): void {
    [$ws, $user] = helpKbWorld();
    $article = helpKbArticle(helpKbSection(helpKbCategory($ws)), $user);

    $probe = function (string $locale, string $title, string $body) use ($article): string {
        $id = (string) Str::uuid();
        DB::table('kb_article_translations')->insert([
            'id' => $id, 'article_id' => $article->id, 'locale' => $locale,
            'title' => $title, 'body' => $body, 'status' => 'published',
        ]);

        return (string) DB::table('kb_article_translations')->where('id', $id)->value('search');
    };

    // French: "traitées" must reduce to the stem a search for "traiter" produces.
    expect($probe('fr', 'Demandes', 'Les demandes sont traitées rapidement'))->toContain('trait');
    // German: nouns and plurals reduce ("Anfragen" -> "anfrag").
    expect($probe('de', 'Anfragen', 'Anfragen zu Rechnungen'))->toContain('anfrag');
});

it('matches a stemmed query within its own locale and not across locales', function (): void {
    [$ws, $user] = helpKbWorld();
    $article = helpKbArticle(helpKbSection(helpKbCategory($ws)), $user);

    foreach ([['fr', 'Demandes', 'Les demandes sont traitées rapidement'], ['de', 'Anfragen', 'Anfragen zu Rechnungen']] as [$loc, $t, $b]) {
        DB::table('kb_article_translations')->insert([
            'id' => (string) Str::uuid(), 'article_id' => $article->id, 'locale' => $loc,
            'title' => $t, 'body' => $b, 'status' => 'published',
        ]);
    }

    $matches = fn (string $loc, string $config, string $q): int => DB::table('kb_article_translations')
        ->where('article_id', $article->id)->where('locale', $loc)
        ->whereRaw("search @@ websearch_to_tsquery('{$config}', ?)", [$q])->count();

    expect($matches('fr', 'french', 'traiter'))->toBe(1);
    expect($matches('de', 'german', 'Anfrage'))->toBe(1);
    // A German row must not answer a French query — that would mean the CASE
    // silently fell through to one configuration for every locale.
    expect($matches('de', 'french', 'traiter'))->toBe(0);
});
