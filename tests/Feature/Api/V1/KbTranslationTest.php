<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\Repositories\KbTranslationRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

afterEach(fn () => Workspace::forgetCurrent());

/** Seed a translation row directly, bypassing the API under test. */
function kbSeedTranslation(string $articleId, string $locale, array $over = []): string
{
    $id = (string) Str::uuid();
    DB::table('kb_article_translations')->insert(array_merge([
        'id' => $id, 'article_id' => $articleId, 'locale' => $locale,
        'title' => 'Titre', 'body' => 'Corps du texte.', 'status' => 'draft',
        'created_at' => now(), 'updated_at' => now(),
    ], $over));

    return $id;
}

it('lists every supported locale, source first, with nulls for untranslated ones', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user);
    kbSeedTranslation($art->id, 'fr', ['status' => 'published']);

    $rows = $this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/translations")->assertStatus(200)->json('data');

    expect(collect($rows)->pluck('locale')->all())->toBe(['en', 'fr', 'de', 'es', 'it', 'pt-BR']);
    expect($rows[0])->toMatchArray(['locale' => 'en', 'name' => 'English', 'is_source' => true, 'status' => null, 'stale' => false]);
    expect($rows[1])->toMatchArray(['locale' => 'fr', 'name' => 'French', 'is_source' => false, 'status' => 'published']);
    expect($rows[1]['updated_at'])->not->toBeNull();
    // Untranslated locales carry status null — there is no separate "exists" flag.
    expect($rows[2])->toMatchArray(['locale' => 'de', 'status' => null, 'updated_at' => null, 'stale' => false]);
});

it('marks a translation stale once the source article changes after it', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user);
    kbSeedTranslation($art->id, 'fr', ['updated_at' => now()->subDays(5)]);
    kbSeedTranslation($art->id, 'de', ['updated_at' => now()->addMinute()]);

    $rows = collect($this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/translations")->json('data'))->keyBy('locale');

    expect($rows['fr']['stale'])->toBeTrue();
    expect($rows['de']['stale'])->toBeFalse();
});

it('gates the list on is_agent, including an owner without the capability', function (): void {
    [, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user);
    // kbAuthWorld builds its OWN workspace for the non-agent actor. The gate
    // check is the first statement in the use case, before any article lookup,
    // so the request stays scoped to that actor's own workspace — re-pointing
    // to $ws here would make TokenGuard's workspace-scoped User::find() miss
    // the non-agent user entirely (401 instead of 403; see TokenGuard's doc).
    [$nonAgent] = kbAuthWorld(['is_agent' => false, 'admin_level' => 'owner']);

    $this->withToken($nonAgent)->getJson("/v1/kb/articles/{$art->id}/translations")->assertStatus(403);
});

it('404s a foreign-workspace or malformed article id', function (): void {
    [$token, $ws] = kbAuthWorld();
    $other = Workspace::factory()->create();
    $this->actingInWorkspace($other);
    $foreignUser = User::factory()->for($other, 'workspace')->create();
    $foreign = kbAuthArticle(kbAuthSection(kbAuthCategory($other, ['slug' => 'f'])), $foreignUser);
    $this->actingInWorkspace($ws);

    $this->withToken($token)->getJson("/v1/kb/articles/{$foreign->id}/translations")->assertStatus(404);
    $this->withToken($token)->getJson('/v1/kb/articles/not-a-uuid/translations')->assertStatus(404);
});

it('creates then updates the one row for a locale, never a duplicate', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user);
    $url = "/v1/kb/articles/{$art->id}/translations/fr";

    $this->withToken($token)->putJson($url, ['title' => 'Titre', 'body' => 'Corps.'])->assertStatus(200)
        ->assertJsonPath('data.locale', 'fr')->assertJsonPath('data.status', 'draft');
    $this->withToken($token)->putJson($url, ['title' => 'Titre v2', 'body' => 'Corps v2.'])->assertStatus(200)
        ->assertJsonPath('data.title', 'Titre v2');

    expect(DB::table('kb_article_translations')->where('article_id', $art->id)->where('locale', 'fr')->count())->toBe(1);
});

it('refuses the source language and unsupported locales', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user);

    $this->withToken($token)->putJson("/v1/kb/articles/{$art->id}/translations/en", ['title' => 'x', 'body' => 'y'])
        ->assertStatus(422)->assertJsonValidationErrors('locale');
    $this->withToken($token)->putJson("/v1/kb/articles/{$art->id}/translations/zz", ['title' => 'x', 'body' => 'y'])
        ->assertStatus(422)->assertJsonValidationErrors('locale');
});

it('refuses to publish a translation while the English article is a draft', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user, ['status' => 'draft', 'published_at' => null]);
    kbSeedTranslation($art->id, 'fr');

    $this->withToken($token)->postJson("/v1/kb/articles/{$art->id}/translations/fr/status", ['status' => 'published'])
        ->assertStatus(422)->assertJsonPath('errors.status.0', 'Publish the English article first.');

    // Draft and archived are always allowed, whatever the article's state.
    $this->withToken($token)->postJson("/v1/kb/articles/{$art->id}/translations/fr/status", ['status' => 'archived'])->assertStatus(200);
});

it('refuses to publish a translation with an empty body', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user);
    kbSeedTranslation($art->id, 'fr', ['body' => '   ']);

    $this->withToken($token)->postJson("/v1/kb/articles/{$art->id}/translations/fr/status", ['status' => 'published'])
        ->assertStatus(422)->assertJsonPath('errors.status.0', 'Add some content before publishing.');
});

it('publishes a translation when the article is published and the body has content', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user);
    kbSeedTranslation($art->id, 'fr');

    $this->withToken($token)->postJson("/v1/kb/articles/{$art->id}/translations/fr/status", ['status' => 'published'])
        ->assertStatus(200)->assertJsonPath('data.status', 'published');
});

it('deletes one locale only, leaving the article and other translations intact', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user, ['title' => 'Source title']);
    kbSeedTranslation($art->id, 'fr');
    kbSeedTranslation($art->id, 'de');

    $this->withToken($token)->deleteJson("/v1/kb/articles/{$art->id}/translations/fr")->assertStatus(204);

    expect(DB::table('kb_article_translations')->where('article_id', $art->id)->pluck('locale')->all())->toBe(['de']);
    expect($art->refresh()->title)->toBe('Source title');
});

it('pins KbTranslationRepository::find, upsert and delete directly', function (): void {
    [, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user);
    $repo = app(KbTranslationRepository::class);

    expect($repo->find($art->id, 'fr'))->toBeNull();

    $created = $repo->upsert($art->id, 'fr', ['title' => 'Titre', 'body' => 'Corps.']);
    expect($created->status)->toBe('draft');
    expect($repo->find($art->id, 'fr')?->id)->toBe($created->id);

    // Publish out-of-band, then upsert title/body only — the update branch must
    // preserve whatever status the row already carried.
    $repo->upsert($art->id, 'fr', ['status' => 'published']);
    $updated = $repo->upsert($art->id, 'fr', ['title' => 'Titre v2', 'body' => 'Corps v2.']);
    expect($updated->status)->toBe('published');
    expect($updated->title)->toBe('Titre v2');

    $repo->delete($updated);
    expect($repo->find($art->id, 'fr'))->toBeNull();
});

it('treats an equal timestamp as fresh, not stale', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user);
    // Postgres freezes now() for the whole transaction, so an insert that takes
    // the column default lands on the exact same instant as the article's own
    // updated_at. stale is computed with a strict lt(), so equal must read false.
    kbSeedTranslation($art->id, 'fr', ['updated_at' => $art->updated_at]);

    $rows = collect($this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/translations")->json('data'))->keyBy('locale');

    expect($rows['fr']['stale'])->toBeFalse();
});

it('gates every write on is_agent and 404s foreign or malformed article ids', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user);
    kbSeedTranslation($art->id, 'fr');

    // The non-agent gets its OWN workspace, which stays current for these three
    // assertions. The capability gate is the use case's literal first statement,
    // so it fires before any tenant-scoped article lookup — which is exactly why
    // a foreign $art->id still yields 403 here and not 404.
    [$nonAgent] = kbAuthWorld(['is_agent' => false, 'admin_level' => 'owner']);
    $this->withToken($nonAgent)->putJson("/v1/kb/articles/{$art->id}/translations/fr", ['title' => 'x', 'body' => 'y'])->assertStatus(403);
    $this->withToken($nonAgent)->postJson("/v1/kb/articles/{$art->id}/translations/fr/status", ['status' => 'draft'])->assertStatus(403);
    $this->withToken($nonAgent)->deleteJson("/v1/kb/articles/{$art->id}/translations/fr")->assertStatus(403);

    // EnsureValidTenantSession pins the tenant id into the session on the first
    // authenticated request (the three calls above pinned it to the non-agent's
    // workspace); the array session driver leaks that pin across same-test
    // cross-tenant calls (see KbArticleTest, KbVersionTest). Flush before
    // switching back so $token authenticates again for the 404 cases.
    test()->flushSession();
    $this->actingInWorkspace($ws);
    $this->withToken($token)->putJson('/v1/kb/articles/not-a-uuid/translations/fr', ['title' => 'x', 'body' => 'y'])->assertStatus(404);
    // A supported locale with no row for this article is also a 404.
    $this->withToken($token)->deleteJson("/v1/kb/articles/{$art->id}/translations/it")->assertStatus(404);
});
