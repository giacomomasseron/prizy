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

it('still surfaces untranslated articles below translated hits, in that order', function (): void {
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    // Both groups must be non-empty here: the translated hit is found by the
    // French query itself (not merely excluded from the fallback), and the
    // untranslated article is found by the plain English search — so ranking
    // (translated first) is actually exercised, not just presence.
    $translated = helpKbArticle($sec, $user, ['title' => 'Billing cycle', 'slug' => 'billing-cycle', 'body' => 'About billing cycles.']);
    helpKbArticle($sec, $user, ['title' => 'Support hours', 'slug' => 'support-hours', 'body' => 'Mentions the zzzqux keyword too.']);
    helpSeedTranslation($translated->id, 'fr', ['title' => 'Cycle de facturation', 'body' => 'Cette page contient le mot zzzqux.']);

    $this->get('/help/search?q=zzzqux&lang=fr')->assertOk()
        ->assertSeeInOrder(['Cycle de facturation', 'Support hours']);
});

it('excludes an already-translated article from the English fallback even when its translation does not match this query', function (): void {
    // The bug this guards against: building the fallback's exclusion set from
    // "ids the translated query matched" rather than "ids that HAVE a
    // published translation" lets an already-translated article's ENGLISH row
    // slip back into results whenever its translation doesn't happen to
    // contain the search term — misrepresenting what exists in French.
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    $translatedArticle = helpKbArticle($sec, $user, ['title' => 'Quarterly statements', 'slug' => 'quarterly-statements', 'body' => 'How billing statements are generated each quarter.']);
    helpKbArticle($sec, $user, ['title' => 'Payment limits', 'slug' => 'payment-limits', 'body' => 'Billing limits per payment method.']);
    // Published and real, but its own French text never says "billing" — so
    // this query will not find it directly.
    helpSeedTranslation($translatedArticle->id, 'fr', ['title' => 'Relevés trimestriels', 'body' => 'Comment les états sont produits chaque trimestre.']);

    $res = $this->get('/help/search?q=billing&lang=fr')->assertOk();
    // Genuinely untranslated — show it.
    $res->assertSee('Payment limits');
    // Already translated — must not resurface under its English title.
    $res->assertDontSee('Quarterly statements');
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
