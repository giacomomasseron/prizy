<?php

declare(strict_types=1);

use App\Models\KbArticleVersion;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\KbVersionRepository;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

afterEach(fn () => Workspace::forgetCurrent());

/** @return int number of version rows for an article */
function kbVersionCount(string $articleId): int
{
    return DB::table('kb_article_versions')->where('article_id', $articleId)->count();
}

/** @return object|null newest version row for an article */
function kbNewestVersion(string $articleId): ?object
{
    return DB::table('kb_article_versions')->where('article_id', $articleId)
        ->orderByDesc('created_at')->orderByDesc('id')->first();
}

it('records one version when an article is created, mirroring it', function (): void {
    [$token, $ws] = kbAuthWorld();
    $sec = kbAuthSection(kbAuthCategory($ws));

    $id = $this->withToken($token)->postJson('/v1/kb/articles', [
        'section_id' => $sec->id, 'title' => 'Exporting to CSV', 'slug' => 'exporting-to-csv', 'body' => "## Steps\n\n1. Open export",
    ])->assertStatus(201)->json('data.id');

    expect(kbVersionCount($id))->toBe(1);
    $v = kbNewestVersion($id);
    expect($v->title)->toBe('Exporting to CSV');
    expect($v->body)->toContain('## Steps');
});

it('records a version when the title or body changes, and none when neither does', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $sec = kbAuthSection(kbAuthCategory($ws));
    $art = kbAuthArticle($sec, $user, ['title' => 'Original', 'body' => 'Body one.']);
    // The article was seeded directly, so give it the baseline version create() would have written.
    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['body' => 'Body two.'])->assertStatus(200);
    $base = kbVersionCount($art->id);

    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['title' => 'Renamed'])->assertStatus(200);
    expect(kbVersionCount($art->id))->toBe($base + 1);

    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['body' => 'Body three.'])->assertStatus(200);
    expect(kbVersionCount($art->id))->toBe($base + 2);

    // A save that changes nothing must not inflate history.
    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['title' => 'Renamed', 'body' => 'Body three.'])->assertStatus(200);
    expect(kbVersionCount($art->id))->toBe($base + 2);
});

it('records no version for a slug-only edit, a section move, or any status change', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $cat = kbAuthCategory($ws);
    $s1 = kbAuthSection($cat, ['slug' => 's1']);
    $s2 = kbAuthSection($cat, ['slug' => 's2']);
    $art = kbAuthArticle($s1, $user, ['status' => 'draft', 'published_at' => null, 'body' => 'Content.']);
    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['body' => 'Content v2.'])->assertStatus(200);
    $base = kbVersionCount($art->id);

    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['slug' => 'new-slug'])->assertStatus(200);
    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['section_id' => $s2->id])->assertStatus(200);
    foreach (['published', 'draft', 'archived', 'draft'] as $status) {
        $this->withToken($token)->postJson("/v1/kb/articles/{$art->id}/status", ['status' => $status])->assertStatus(200);
    }

    expect(kbVersionCount($art->id))->toBe($base);
});

it('attributes the version to the acting agent, not the article’s original author', function (): void {
    [, $ws, $author] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $author, ['body' => 'First.']);

    // A DIFFERENT agent, in the same workspace, makes the edit.
    $editor = User::factory()->for($ws, 'workspace')->create(['is_agent' => true, 'email_verified_at' => now()]);
    $editorToken = app(CreatePersonalAccessToken::class)->handle($editor, 't', null)['token'];

    $this->withToken($editorToken)->patchJson("/v1/kb/articles/{$art->id}", ['body' => 'Second.'])->assertStatus(200);

    expect(kbNewestVersion($art->id)->author_id)->toBe($editor->id);
    expect($art->refresh()->author_id)->toBe($author->id); // the article's own author never changes
});

it('backfills one version per pre-existing article, idempotently', function (): void {
    [, $ws, $user] = kbAuthWorld();
    $sec = kbAuthSection(kbAuthCategory($ws));
    $art = kbAuthArticle($sec, $user, ['title' => 'Legacy', 'body' => 'Legacy body.']);
    DB::table('kb_article_versions')->where('article_id', $art->id)->delete(); // simulate a pre-HC-5 row

    $migration = require base_path('database/migrations/2026_09_12_000001_index_and_backfill_kb_article_versions.php');
    $migration->up();
    expect(kbVersionCount($art->id))->toBe(1);
    $migration->up(); // idempotent
    expect(kbVersionCount($art->id))->toBe(1);

    $v = kbNewestVersion($art->id);
    expect($v->title)->toBe('Legacy');
    expect($v->body)->toBe('Legacy body.');
    expect($v->author_id)->toBe($user->id);
});

it('keeps the article write and its version write atomic: a failed version write leaves the article unchanged', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $sec = kbAuthSection(kbAuthCategory($ws));
    $art = kbAuthArticle($sec, $user, ['title' => 'Original', 'body' => 'Body one.']);

    // Force the version write to fail via a model event — KbVersionRepository
    // is final, so it cannot be subclassed into a Mockery double, and by the
    // time this test runs the class is already autoloaded elsewhere in the
    // suite, so Mockery's overload/alias mocking (which only works before a
    // class is first loaded) is not reliable either. Hooking KbArticleVersion's
    // `creating` event forces the exact same failure point — inside
    // recordVersion()'s KbArticleVersion::create() call — without needing to
    // fake the repository at all.
    KbArticleVersion::creating(function (): void {
        throw new RuntimeException('forced failure for atomicity test');
    });

    try {
        $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['body' => 'Body two.'])
            ->assertStatus(500);
    } finally {
        KbArticleVersion::flushEventListeners();
    }

    expect($art->refresh()->body)->toBe('Body one.');
    expect(kbVersionCount($art->id))->toBe(0);
});

it('lists versions newest first with derived summaries', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $sec = kbAuthSection(kbAuthCategory($ws));
    $art = kbAuthArticle($sec, $user, ['title' => 'One', 'body' => 'Body one.']);
    // Seeded directly (forceCreate), so give it the baseline version create() would have written.
    app(KbVersionRepository::class)->recordVersion($art, $user);
    $patch = fn (array $data) => $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", $data)->assertStatus(200);
    $patch(['body' => 'Body two.']);          // Body only
    $patch(['title' => 'Two']);               // Title only
    $patch(['title' => 'Three', 'body' => 'Body three.']); // Title and body

    $rows = $this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/versions")->assertStatus(200)->json('data');
    expect(collect($rows)->pluck('summary')->all())->toBe(['Title and body', 'Title only', 'Body only', 'Created']);
    expect($rows[0]['is_current'])->toBeTrue();
    expect($rows[1]['is_current'])->toBeFalse();
    expect($rows[0]['author']['name'])->toBe($user->name);
});

it('shows a version with rendered html and a diff against the current article', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $sec = kbAuthSection(kbAuthCategory($ws));
    $art = kbAuthArticle($sec, $user, ['title' => 'Old title', 'body' => "## Heading\n\nkept\ngone"]);
    // Seeded directly (forceCreate), so give it the baseline version create() would have written.
    app(KbVersionRepository::class)->recordVersion($art, $user);
    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['title' => 'New title', 'body' => "## Heading\n\nkept\nadded"])->assertStatus(200);

    $rows = $this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/versions")->json('data');
    $oldest = end($rows);
    $res = $this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/versions/{$oldest['id']}")->assertStatus(200)->json('data');

    expect($res['title'])->toBe('Old title');
    expect($res['html'])->toContain('<h2>Heading</h2>');
    expect($res['diff']['title'])->toBe(['from' => 'Old title', 'to' => 'New title']);
    expect($res['diff']['added'])->toBe(1);
    expect($res['diff']['removed'])->toBe(1);
    expect($res['is_current'])->toBeFalse();
});

it('returns a null diff for the current version', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user, ['body' => 'Only.']);
    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['body' => 'Only v2.'])->assertStatus(200);
    $newest = $this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/versions")->json('data.0');

    $res = $this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/versions/{$newest['id']}")->assertStatus(200)->json('data');
    expect($res['is_current'])->toBeTrue();
    expect($res['diff'])->toBeNull();
});

it('escapes hostile markdown in a version exactly as the public renderer does', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user, ['body' => '<img src=x onerror=alert(1)>']);
    // Seeded directly (forceCreate), so give it the baseline version create() would have written.
    app(KbVersionRepository::class)->recordVersion($art, $user);
    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['body' => 'safe'])->assertStatus(200);
    $oldest = collect($this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/versions")->json('data'))->last();

    $html = $this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/versions/{$oldest['id']}")->json('data.html');
    expect($html)->toContain('&lt;img')->not->toContain('<img src=x');
});

it('gates both reads on is_agent and 404s foreign or mismatched ids', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user);
    // Seeded directly (forceCreate), so give it the baseline version create() would have written —
    // otherwise this never-edited article would have zero versions and `data.0.id` below would be null.
    app(KbVersionRepository::class)->recordVersion($art, $user);
    $other = kbAuthArticle(kbAuthSection(kbAuthCategory($ws, ['slug' => 'other']), ['slug' => 'other-sec']), $user, ['slug' => 'other-art']);
    $version = $this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/versions")->json('data.0.id');

    // A version id belonging to a DIFFERENT article in the same workspace.
    $this->withToken($token)->getJson("/v1/kb/articles/{$other->id}/versions/{$version}")->assertStatus(404);
    $this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/versions/not-a-uuid")->assertStatus(404);

    $foreignWs = Workspace::factory()->create();
    $foreignWs->makeCurrent();
    $foreignUser = User::factory()->for($foreignWs, 'workspace')->create();
    $foreign = kbAuthArticle(kbAuthSection(kbAuthCategory($foreignWs, ['slug' => 'f'])), $foreignUser);
    $ws->makeCurrent();
    $this->withToken($token)->getJson("/v1/kb/articles/{$foreign->id}/versions")->assertStatus(404);

    // session driver leaks the previous tenant pin across same-test
    // cross-tenant calls (see TrackerReportTest). Flush before switching.
    test()->flushSession();
    [$nonAgent] = kbAuthWorld(['is_agent' => false, 'admin_level' => 'owner']);
    $this->withToken($nonAgent)->getJson("/v1/kb/articles/{$art->id}/versions")->assertStatus(403);
    $this->withToken($nonAgent)->getJson("/v1/kb/articles/{$art->id}/versions/{$version}")->assertStatus(403);
});

it('still lists versions when their author has been soft-deleted', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $art = kbAuthArticle(kbAuthSection(kbAuthCategory($ws)), $user, ['body' => 'One.']);
    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['body' => 'Two.'])->assertStatus(200);
    $version = $this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/versions")->json('data.0.id');

    $user->delete(); // soft delete — the HC-4 Critical bug class
    expect($user->trashed())->toBeTrue();

    $rows = $this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/versions")->assertStatus(200)->json('data');
    expect($rows[0]['author']['name'])->toBe($user->name);
    $this->withToken($token)->getJson("/v1/kb/articles/{$art->id}/versions/{$version}")->assertStatus(200);
});
