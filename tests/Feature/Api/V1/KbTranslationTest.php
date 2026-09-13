<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
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
