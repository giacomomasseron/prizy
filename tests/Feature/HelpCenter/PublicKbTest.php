<?php

declare(strict_types=1);

use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\KbSection;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:Workspace,1:User} */
function helpKbWorld(): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create();

    return [$ws, $user];
}

function helpKbCategory(Workspace $ws, string $slug = 'getting-started', array $attrs = []): KbCategory
{
    return KbCategory::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id,
        'name' => 'Getting started', 'slug' => $slug,
        'description' => 'Set up your workspace.', 'icon' => '◇', 'color' => 'var(--sup)',
    ], $attrs));
}

function helpKbSection(KbCategory $cat, string $slug = 'basics'): KbSection
{
    return KbSection::forceCreate([
        'id' => (string) Str::uuid(), 'category_id' => $cat->id, 'name' => ucfirst($slug), 'slug' => $slug,
    ]);
}

/** @param array<string,mixed> $attrs */
function helpKbArticle(KbSection $sec, User $author, array $attrs = []): KbArticle
{
    return KbArticle::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'section_id' => $sec->id, 'author_id' => $author->id,
        'title' => 'Create your first project', 'slug' => 'create-your-first-project',
        'body' => "Intro paragraph.\n\n- **bold tip** one\n- tip two", 'status' => 'published',
        'published_at' => now()->subDay(),
    ], $attrs));
}

it('renders home with topic cards, counts excluding drafts, and hides empty categories', function (): void {
    [$ws, $user] = helpKbWorld();
    $cat = helpKbCategory($ws);
    $sec = helpKbSection($cat);
    helpKbArticle($sec, $user);
    helpKbArticle($sec, $user, ['slug' => 'a-draft', 'title' => 'Draft thing', 'status' => 'draft', 'published_at' => null]);
    helpKbCategory($ws, 'empty-topic', ['name' => 'Empty topic']);

    $res = $this->get('/help')->assertOk();
    $res->assertSee('How can we help?');
    $res->assertSee('Getting started');
    $res->assertSee('1 article');           // draft not counted
    $res->assertDontSee('Empty topic');     // zero published → hidden

    Workspace::forgetCurrent();
});

it('renders the topic page with sections and published articles only', function (): void {
    [$ws, $user] = helpKbWorld();
    $cat = helpKbCategory($ws);
    $sec = helpKbSection($cat);
    helpKbArticle($sec, $user);
    helpKbArticle($sec, $user, ['slug' => 'a-draft', 'title' => 'Hidden draft', 'status' => 'draft', 'published_at' => null]);

    $res = $this->get('/help/getting-started')->assertOk();
    $res->assertSee('Basics');
    $res->assertSee('Create your first project');
    $res->assertDontSee('Hidden draft');

    Workspace::forgetCurrent();
});

it('renders the article with safe markdown and increments views', function (): void {
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    $article = helpKbArticle($sec, $user, ['body' => "Para.\n\n- **bold tip**\n\n<script>alert(1)</script>"]);

    $res = $this->get('/help/getting-started/basics/create-your-first-project')->assertOk();
    $res->assertSee('<strong>bold tip</strong>', false);            // markdown rendered
    $res->assertDontSee('<script>alert(1)</script>', false);        // raw HTML escaped
    $res->assertSee('Was this helpful?');
    expect($article->refresh()->views_count)->toBe(1);

    Workspace::forgetCurrent();
});

it('does not bump updated_at when an anonymous view increments the counter', function (): void {
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    $article = helpKbArticle($sec, $user, ['updated_at' => now()->subWeek()]);
    $before = $article->refresh()->updated_at;

    $this->get('/help/getting-started/basics/create-your-first-project')->assertOk();

    expect($article->refresh()->updated_at)->toEqual($before);

    Workspace::forgetCurrent();
});

it('does not bump updated_at when feedback is recorded', function (): void {
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    $article = helpKbArticle($sec, $user, ['updated_at' => now()->subWeek()]);
    $before = $article->refresh()->updated_at;

    $this->post("/help/articles/{$article->id}/feedback", ['vote' => 'up'])->assertRedirect();

    expect($article->refresh()->updated_at)->toEqual($before);

    Workspace::forgetCurrent();
});

it('404s drafts and wrong slug chains', function (): void {
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    helpKbArticle($sec, $user, ['slug' => 'draft-a', 'status' => 'draft', 'published_at' => null]);

    $this->get('/help/getting-started/basics/draft-a')->assertNotFound();
    $this->get('/help/nope')->assertNotFound();
    $this->get('/help/getting-started/nope/create-your-first-project')->assertNotFound();

    Workspace::forgetCurrent();
});

it('searches published articles by title and body, title hits ranked first', function (): void {
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    helpKbArticle($sec, $user, ['slug' => 'title-hit', 'title' => 'Exporting tickets to CSV', 'body' => 'Plain text here.']);
    helpKbArticle($sec, $user, ['slug' => 'body-hit', 'title' => 'Weekly reports', 'body' => 'You can also try exporting tickets from the reporting page.']);
    helpKbArticle($sec, $user, ['slug' => 'draft-hit', 'title' => 'Exporting drafts', 'status' => 'draft', 'published_at' => null]);

    $res = $this->get('/help/search?q=exporting+tickets')->assertOk();
    $content = $res->getContent();
    $res->assertSee('Exporting tickets to CSV');
    $res->assertSee('Weekly reports');
    $res->assertDontSee('Exporting drafts');
    expect(strpos($content, 'Exporting tickets to CSV'))->toBeLessThan(strpos($content, 'Weekly reports'));

    $this->get('/help/search?q=')->assertRedirect('/help');

    Workspace::forgetCurrent();
});

it('escapes a hostile article body inside the search snippet', function (): void {
    // Note: ts_headline() itself recognizes well-formed tag tokens like
    // <em>...</em> or <script>...</script> and strips them from the snippet
    // before PHP ever sees them — so a payload like that would pass this
    // assertion even with a completely unescaped Blade view (false confidence).
    // A tag WITH attributes/whitespace (e.g. <img src=x onerror=...>) is NOT
    // recognized by Postgres's simple tag grammar and survives ts_headline
    // verbatim, so it's the payload that actually exercises the escape path.
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    helpKbArticle($sec, $user, [
        'slug' => 'hostile-hit',
        'title' => 'Hostile snippet target',
        'body' => 'Before text hostilesnippet <img src=x onerror=alert(1)> after text to pad the headline window nicely.',
    ]);

    $res = $this->get('/help/search?q=hostilesnippet')->assertOk();
    $content = $res->getContent();

    expect($content)->toContain('Hostile snippet target');
    expect($content)->not->toContain('<img src=x onerror=alert(1)>');   // raw markup from the article body must be escaped
    expect($content)->toContain('&lt;img src=x onerror=alert(1)&gt;');

    Workspace::forgetCurrent();
});

it('records helpful and unhelpful feedback', function (): void {
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    $article = helpKbArticle($sec, $user);

    $this->post("/help/articles/{$article->id}/feedback", ['vote' => 'up'])->assertRedirect();
    $this->post("/help/articles/{$article->id}/feedback", ['vote' => 'down'])->assertRedirect();
    $article->refresh();
    expect($article->helpful_count)->toBe(1);
    expect($article->unhelpful_count)->toBe(1);

    $invalid = $this->post("/help/articles/{$article->id}/feedback", ['vote' => 'sideways']);
    $invalid->assertStatus(302); // invalid → redirect back, no increment
    expect($invalid->headers->get('Location'))->not->toContain('voted=1');
    expect($article->refresh()->helpful_count)->toBe(1);

    // Array input (e.g. vote[]=up) must never 500 — just an invalid vote.
    $arrayVote = $this->post("/help/articles/{$article->id}/feedback", ['vote' => ['up']]);
    $arrayVote->assertRedirect();
    expect($arrayVote->headers->get('Location'))->not->toContain('voted=1');
    expect($article->refresh()->helpful_count)->toBe(1);

    Workspace::forgetCurrent();
});

it('never reflects a cross-host referer into the feedback redirect', function (): void {
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    $article = helpKbArticle($sec, $user);

    $res = $this->withHeaders(['Referer' => 'https://evil.example/x'])
        ->post("/help/articles/{$article->id}/feedback", ['vote' => 'up']);

    $res->assertRedirect();
    expect($res->headers->get('Location'))->not->toContain('evil.example');

    Workspace::forgetCurrent();
});

it('404s a malformed article id on the feedback route instead of erroring', function (): void {
    [$ws] = helpKbWorld();

    $this->post('/help/articles/not-a-uuid/feedback', ['vote' => 'up'])->assertNotFound();

    Workspace::forgetCurrent();
});

it('isolates workspaces on pages and search', function (): void {
    [$ws, $user] = helpKbWorld();
    $sec = helpKbSection(helpKbCategory($ws));
    helpKbArticle($sec, $user, ['title' => 'Mine only']);

    Workspace::forgetCurrent();
    $foreign = Workspace::factory()->create();
    $foreign->makeCurrent();
    $fUser = User::factory()->for($foreign, 'workspace')->create();
    $fSec = helpKbSection(helpKbCategory($foreign, 'foreign-topic', ['name' => 'Foreign topic']));
    helpKbArticle($fSec, $fUser, ['title' => 'Foreign secret article', 'slug' => 'foreign-secret']);
    Workspace::forgetCurrent();
    test()->actingInWorkspace($ws);

    $this->get('/help')->assertOk()->assertDontSee('Foreign topic');
    $this->get('/help/foreign-topic')->assertNotFound();
    $this->get('/help/foreign-topic/basics/foreign-secret')->assertNotFound();
    $this->get('/help/search?q=foreign+secret')->assertOk()->assertDontSee('Foreign secret article');

    Workspace::forgetCurrent();
});

it('routes /help/search to the search action, not the {category} catch-all', function (): void {
    [$ws] = helpKbWorld();

    // If the reserved-slug route constraint regressed and 'search' fell
    // through to the {category} topic route instead, this would 404 (no
    // category named "search") rather than redirect — the search action
    // redirects to /help on an empty query.
    $this->get('/help/search')->assertRedirect('/help');

    Workspace::forgetCurrent();
});
