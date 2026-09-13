<?php

declare(strict_types=1);

use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

afterEach(fn () => Workspace::forgetCurrent());

it('finds a French translation by a French stemmed query', function (): void {
    [$ws, $user] = helpKbWorld();
    $art = helpKbArticle(helpKbSection(helpKbCategory($ws)), $user, ['title' => 'Invoices', 'body' => 'About invoices.']);
    helpSeedTranslation($art->id, 'fr', ['title' => 'Factures', 'body' => 'Les factures sont envoyées chaque mois.']);

    $this->get('/help/search?q=facture&lang=fr')->assertOk()->assertSee('Factures');
});

it('still surfaces untranslated articles below translated hits', function (): void {
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    $translated = helpKbArticle($sec, $user, ['title' => 'Invoices', 'slug' => 'invoices', 'body' => 'About invoices.']);
    helpKbArticle($sec, $user, ['title' => 'Invoice limits', 'slug' => 'invoice-limits', 'body' => 'More about invoices.']);
    helpSeedTranslation($translated->id, 'fr', ['title' => 'Factures', 'body' => 'Les factures mensuelles.']);

    // The untranslated English article stays findable rather than vanishing.
    $this->get('/help/search?q=invoice&lang=fr')->assertOk()->assertSee('Invoice limits');
});

it('does not leak a draft translation into results', function (): void {
    [$ws, $user] = helpKbWorld();
    $art = helpKbArticle(helpKbSection(helpKbCategory($ws)), $user, ['title' => 'Invoices', 'body' => 'About invoices.']);
    helpSeedTranslation($art->id, 'fr', ['title' => 'Brouillon secret', 'body' => 'Ne pas montrer.', 'status' => 'draft']);

    $this->get('/help/search?q=brouillon&lang=fr')->assertOk()->assertDontSee('Brouillon secret');
});

it('does not return a translation whose article was soft-deleted', function (): void {
    // searchPublished starts from the translations table, so kb_articles'
    // SoftDeletes scope does NOT apply the way it does in KbRepository::search().
    // This is the test for that explicit predicate.
    [$ws, $user] = helpKbWorld();
    $art = helpKbArticle(helpKbSection(helpKbCategory($ws)), $user, ['title' => 'Invoices', 'body' => 'About invoices.']);
    helpSeedTranslation($art->id, 'fr', ['title' => 'Factures', 'body' => 'Les factures mensuelles.']);
    $art->delete();

    $this->get('/help/search?q=facture&lang=fr')->assertOk()->assertDontSee('Factures');
});

it('leaves English search exactly as it was', function (): void {
    [$ws, $user] = helpKbWorld();
    helpKbArticle(helpKbSection(helpKbCategory($ws)), $user, ['title' => 'Invoices', 'body' => 'About invoices.']);

    $this->get('/help/search?q=invoice')->assertOk()->assertSee('Invoices');
});

it('shows the language switcher on the search results page', function (): void {
    [$ws, $user] = helpKbWorld();
    helpKbArticle(helpKbSection(helpKbCategory($ws)), $user, ['title' => 'Invoices', 'body' => 'About invoices.']);

    $this->get('/help/search?q=invoice')->assertOk()->assertSee('Read this help center in');
});
