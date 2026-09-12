<?php

declare(strict_types=1);

use App\Models\KbArticle;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

afterEach(fn () => Workspace::forgetCurrent());

function kbArticlePayload(string $sectionId, array $over = []): array
{
    return array_merge(['section_id' => $sectionId, 'title' => 'Exporting to CSV', 'slug' => 'exporting-to-csv', 'body' => "## Steps\n\n1. Open export"], $over);
}

it('creates a draft article by the acting agent, appended last', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $sec = kbAuthSection(kbAuthCategory($ws));
    kbAuthArticle($sec, $user, ['position' => 2]);

    $res = $this->withToken($token)->postJson('/v1/kb/articles', kbArticlePayload($sec->id))->assertStatus(201);
    expect($res->json('data.status'))->toBe('draft');
    expect($res->json('data.position'))->toBe(3);
    expect($res->json('data.author.id'))->toBe($user->id);
    expect($res->json('data.public_url'))->toBeNull();
    expect($res->json('data.body'))->toContain('## Steps');
    expect($res->json('data.category.slug'))->toBe('getting-started');
});

it('rejects foreign section_id (422), duplicate slug in the section, and allows it in another section', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $cat = kbAuthCategory($ws);
    $s1 = kbAuthSection($cat, ['slug' => 's1']);
    $s2 = kbAuthSection($cat, ['slug' => 's2']);
    kbAuthArticle($s1, $user, ['slug' => 'dup']);
    $other = Workspace::factory()->create();
    $other->makeCurrent();
    $foreignSec = kbAuthSection(kbAuthCategory($other, ['slug' => 'f']));
    $ws->makeCurrent();

    $this->withToken($token)->postJson('/v1/kb/articles', kbArticlePayload($foreignSec->id))->assertStatus(422)->assertJsonValidationErrors('section_id');
    $this->withToken($token)->postJson('/v1/kb/articles', kbArticlePayload($s1->id, ['slug' => 'dup']))
        ->assertStatus(422)->assertJsonPath('errors.slug.0', 'Already used in this section.');
    $this->withToken($token)->postJson('/v1/kb/articles', kbArticlePayload($s2->id, ['slug' => 'dup']))->assertStatus(201);
});

it('updates fields, moves between sections (re-checking slug, appended last), never changes the author', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $cat = kbAuthCategory($ws);
    $s1 = kbAuthSection($cat, ['slug' => 's1']);
    $s2 = kbAuthSection($cat, ['slug' => 's2']);
    $art = kbAuthArticle($s1, $user, ['slug' => 'moving']);
    kbAuthArticle($s2, $user, ['slug' => 'other', 'position' => 4]);
    kbAuthArticle($s2, $user, ['slug' => 'moving']);

    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['title' => 'Renamed'])->assertStatus(200);
    expect($art->refresh()->title)->toBe('Renamed');
    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['section_id' => $s2->id])
        ->assertStatus(422)->assertJsonPath('errors.slug.0', 'Already used in this section.');
    $this->withToken($token)->patchJson("/v1/kb/articles/{$art->id}", ['section_id' => $s2->id, 'slug' => 'moved'])->assertStatus(200);
    expect($art->refresh()->section_id)->toBe($s2->id);
    expect($art->position)->toBe(5);
    expect($art->author_id)->toBe($user->id);
});

it('publish stamps published_at once; unpublish/republish keep it; empty body cannot publish; archive/restore', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $sec = kbAuthSection(kbAuthCategory($ws));
    $art = kbAuthArticle($sec, $user, ['status' => 'draft', 'published_at' => null]);
    $empty = kbAuthArticle($sec, $user, ['slug' => 'empty', 'status' => 'draft', 'published_at' => null, 'body' => '   ']);
    $status = fn (KbArticle $a, string $s) => $this->withToken($token)->postJson("/v1/kb/articles/{$a->id}/status", ['status' => $s]);

    $status($empty, 'published')->assertStatus(422)->assertJsonPath('errors.status.0', 'Add some content before publishing.');

    $this->travelTo(now()->subHours(2));
    $status($art, 'published')->assertStatus(200);
    $first = $art->refresh()->published_at;
    expect($first)->not->toBeNull();
    expect($this->withToken($token)->getJson("/v1/kb/articles/{$art->id}")->json('data.public_url'))->toEndWith('/help/getting-started/basics/first-article');
    $this->travelBack();

    $status($art, 'draft')->assertStatus(200);
    expect($art->refresh()->status)->toBe('draft');
    expect($art->published_at->equalTo($first))->toBeTrue();
    $status($art, 'published')->assertStatus(200);
    expect($art->refresh()->published_at->equalTo($first))->toBeTrue();
    $status($art, 'published')->assertStatus(200); // idempotent
    $status($art, 'archived')->assertStatus(200);
    expect($art->refresh()->status)->toBe('archived');
    $status($art, 'draft')->assertStatus(200);
    $status($art, 'sideways')->assertStatus(422);
});

it('blocks blanking a published article body, allows it for drafts, and keeps status idempotency 200 even when the body is already empty', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $sec = kbAuthSection(kbAuthCategory($ws));
    $published = kbAuthArticle($sec, $user, ['slug' => 'pub-guard']);
    $draft = kbAuthArticle($sec, $user, ['slug' => 'draft-guard', 'status' => 'draft', 'published_at' => null]);
    $emptyPublished = kbAuthArticle($sec, $user, ['slug' => 'empty-pub', 'body' => '   ']);

    $this->withToken($token)->patchJson("/v1/kb/articles/{$published->id}", ['body' => '   '])
        ->assertStatus(422)->assertJsonPath('errors.body.0', 'A published article cannot be left empty.');
    expect($published->refresh()->body)->not->toBe('   ');

    $this->withToken($token)->patchJson("/v1/kb/articles/{$draft->id}", ['body' => ''])->assertStatus(200);
    expect($draft->refresh()->body)->toBe('');

    // $emptyPublished is already published with a blank body — re-sending the SAME status must
    // be a 200 no-op, not trip the empty-body guard (that guard only exists to stop a
    // draft→published TRANSITION with no content; it must never fire on a status that isn't changing).
    $this->withToken($token)->postJson("/v1/kb/articles/{$emptyPublished->id}/status", ['status' => 'published'])->assertStatus(200);
});

it('moves within its section only, and hard-deletes freeing the slug', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $cat = kbAuthCategory($ws);
    $s1 = kbAuthSection($cat, ['slug' => 's1']);
    $s2 = kbAuthSection($cat, ['slug' => 's2']);
    $a = kbAuthArticle($s1, $user, ['slug' => 'a', 'title' => 'A', 'position' => 0]);
    $b = kbAuthArticle($s1, $user, ['slug' => 'b', 'title' => 'B', 'position' => 1]);
    $c = kbAuthArticle($s2, $user, ['slug' => 'c', 'title' => 'C', 'position' => 0]);

    $this->withToken($token)->postJson("/v1/kb/articles/{$b->id}/move", ['direction' => 'up'])->assertStatus(200);
    expect([$b->refresh()->position, $a->refresh()->position, $c->refresh()->position])->toBe([0, 1, 0]);
    $this->withToken($token)->postJson("/v1/kb/articles/{$b->id}/move", ['direction' => 'up'])->assertStatus(200); // edge no-op
    expect($b->refresh()->position)->toBe(0);

    $this->withToken($token)->deleteJson("/v1/kb/articles/{$a->id}")->assertStatus(204);
    expect(KbArticle::query()->withTrashed()->whereKey($a->id)->exists())->toBeFalse();
    $this->withToken($token)->postJson('/v1/kb/articles', kbArticlePayload($s1->id, ['slug' => 'a']))->assertStatus(201);
});

it('404s foreign article ids on every route', function (): void {
    [$token, $ws] = kbAuthWorld();
    $other = Workspace::factory()->create();
    $other->makeCurrent();
    $foreignUser = User::factory()->for($other, 'workspace')->create();
    $foreign = kbAuthArticle(kbAuthSection(kbAuthCategory($other, ['slug' => 'f'])), $foreignUser);
    $ws->makeCurrent();

    $this->withToken($token)->getJson("/v1/kb/articles/{$foreign->id}")->assertStatus(404);
    $this->withToken($token)->patchJson("/v1/kb/articles/{$foreign->id}", ['title' => 'x'])->assertStatus(404);
    $this->withToken($token)->postJson("/v1/kb/articles/{$foreign->id}/status", ['status' => 'archived'])->assertStatus(404);
    $this->withToken($token)->postJson("/v1/kb/articles/{$foreign->id}/move", ['direction' => 'up'])->assertStatus(404);
    $this->withToken($token)->deleteJson("/v1/kb/articles/{$foreign->id}")->assertStatus(404);
    $other->makeCurrent();
    expect($foreign->refresh()->status)->toBe('published');
});

it('still reports the author and returns 200 when the author was soft-deleted (removed member)', function (): void {
    [$token, $ws] = kbAuthWorld();
    $author = User::factory()->for($ws, 'workspace')->create(['email_verified_at' => now()]);
    $sec = kbAuthSection(kbAuthCategory($ws));
    $art = kbAuthArticle($sec, $author, ['slug' => 'orphaned']);
    $author->delete(); // soft-delete, as RemoveMember does — a DIFFERENT user than the acting agent above

    $res = $this->withToken($token)->getJson("/v1/kb/articles/{$art->id}")->assertStatus(200);
    expect($res->json('data.author.name'))->toBe($author->name);
});

it('previews markdown through the safe renderer', function (): void {
    [$token] = kbAuthWorld();
    $res = $this->withToken($token)->postJson('/v1/kb/preview', ['body' => "# T\n\n<img src=x onerror=alert(1)>\n\n[l](javascript:alert(1))"])->assertStatus(200);
    expect($res->json('data.html'))->toContain('<h1>T</h1>')->toContain('&lt;img')->not->toContain('href="javascript:');
    // EnsureValidTenantSession pins the tenant id into the session; the array
    // session driver leaks the previous tenant pin across same-test
    // cross-tenant calls (see TrackerReportTest). Flush before switching.
    test()->flushSession();
    [$nonAgent] = kbAuthWorld(['is_agent' => false]);
    $this->withToken($nonAgent)->postJson('/v1/kb/preview', ['body' => 'x'])->assertStatus(403);
});
