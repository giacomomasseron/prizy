<?php

declare(strict_types=1);

use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\KbSection;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} bearer token for a verified is_agent user in a current workspace */
function kbAuthWorld(array $userAttrs = ['is_agent' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function kbAuthCategory(Workspace $ws, array $over = []): KbCategory
{
    return KbCategory::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Getting started', 'slug' => 'getting-started',
        'icon' => '◇', 'color' => '#3aa76d', 'description' => 'Set up.', 'position' => 0,
    ], $over));
}

function kbAuthSection(KbCategory $cat, array $over = []): KbSection
{
    return KbSection::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'category_id' => $cat->id, 'name' => 'Basics', 'slug' => 'basics', 'position' => 0,
    ], $over));
}

function kbAuthArticle(KbSection $sec, User $author, array $over = []): KbArticle
{
    return KbArticle::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'section_id' => $sec->id, 'author_id' => $author->id,
        'title' => 'First article', 'slug' => 'first-article', 'body' => 'Body.', 'status' => 'published',
        'position' => 0, 'published_at' => now()->subDay(),
    ], $over));
}

function kbCategoryPayload(array $over = []): array
{
    return array_merge(['name' => 'Accounts & SSO', 'slug' => 'accounts-sso', 'icon' => '⚿', 'color' => '#5b8def', 'description' => 'Sign-in and SSO.'], $over);
}

afterEach(fn () => Workspace::forgetCurrent());

it('creates a category appended last, in the current workspace', function (): void {
    [$token, $ws] = kbAuthWorld();
    kbAuthCategory($ws, ['position' => 3]);

    $res = $this->withToken($token)->postJson('/v1/kb/categories', kbCategoryPayload())->assertStatus(201);
    expect($res->json('data.slug'))->toBe('accounts-sso');
    expect($res->json('data.position'))->toBe(4);
    expect(KbCategory::query()->where('slug', 'accounts-sso')->value('workspace_id'))->toBe($ws->id);
});

it('gates every mutation on is_agent (owner without it included)', function (): void {
    [$token, $ws] = kbAuthWorld(['is_agent' => false, 'admin_level' => 'owner']);
    $cat = kbAuthCategory($ws);

    $this->withToken($token)->postJson('/v1/kb/categories', kbCategoryPayload())->assertStatus(403);
    $this->withToken($token)->patchJson("/v1/kb/categories/{$cat->id}", kbCategoryPayload())->assertStatus(403);
    $this->withToken($token)->deleteJson("/v1/kb/categories/{$cat->id}")->assertStatus(403);
    $this->withToken($token)->postJson("/v1/kb/categories/{$cat->id}/move", ['direction' => 'up'])->assertStatus(403);
    $this->withToken($token)->postJson("/v1/kb/categories/{$cat->id}/archive-articles")->assertStatus(403);
    $this->withToken($token)->postJson('/v1/kb/sections', ['category_id' => $cat->id, 'name' => 'X', 'slug' => 'x'])->assertStatus(403);
    expect(KbCategory::query()->whereKey($cat->id)->exists())->toBeTrue();
});

it('rejects reserved, malformed and duplicate slugs with the exact messages', function (): void {
    [$token, $ws] = kbAuthWorld();
    kbAuthCategory($ws, ['slug' => 'taken']);

    $this->withToken($token)->postJson('/v1/kb/categories', kbCategoryPayload(['slug' => 'search']))
        ->assertStatus(422)->assertJsonPath('errors.slug.0', 'search, articles, requests, new and login are reserved.');
    $this->withToken($token)->postJson('/v1/kb/categories', kbCategoryPayload(['slug' => 'Bad Slug!']))->assertStatus(422)->assertJsonValidationErrors('slug');
    $this->withToken($token)->postJson('/v1/kb/categories', kbCategoryPayload(['slug' => 'taken']))
        ->assertStatus(422)->assertJsonPath('errors.slug.0', 'Already used by another category.');
});

it('enforces the colour and icon allowlists', function (): void {
    [$token] = kbAuthWorld();
    $this->withToken($token)->postJson('/v1/kb/categories', kbCategoryPayload(['color' => 'url(https://evil.example/x)']))->assertStatus(422)->assertJsonValidationErrors('color');
    $this->withToken($token)->postJson('/v1/kb/categories', kbCategoryPayload(['color' => '#3AA76D']))->assertStatus(422)->assertJsonValidationErrors('color');
    $this->withToken($token)->postJson('/v1/kb/categories', kbCategoryPayload(['icon' => '<b>']))->assertStatus(422)->assertJsonValidationErrors('icon');
});

it('updates, and the same slug on itself is not a duplicate', function (): void {
    [$token, $ws] = kbAuthWorld();
    $cat = kbAuthCategory($ws);
    $this->withToken($token)->patchJson("/v1/kb/categories/{$cat->id}", kbCategoryPayload(['slug' => 'getting-started', 'name' => 'Renamed']))->assertStatus(200);
    expect($cat->refresh()->name)->toBe('Renamed');
});

it('404s foreign and malformed category ids without touching them', function (): void {
    [$token] = kbAuthWorld();
    $other = Workspace::factory()->create();
    $other->makeCurrent();
    $foreign = kbAuthCategory($other, ['slug' => 'foreign']);
    Workspace::forgetCurrent();
    [$token] = kbAuthWorld();

    $this->withToken($token)->patchJson("/v1/kb/categories/{$foreign->id}", kbCategoryPayload())->assertStatus(404);
    $this->withToken($token)->deleteJson("/v1/kb/categories/{$foreign->id}")->assertStatus(404);
    $this->withToken($token)->postJson("/v1/kb/categories/{$foreign->id}/move", ['direction' => 'up'])->assertStatus(404);
    $this->withToken($token)->postJson('/v1/kb/categories/not-a-uuid/move', ['direction' => 'up'])->assertStatus(404);
    $other->makeCurrent();
    expect(KbCategory::query()->whereKey($foreign->id)->exists())->toBeTrue();
});

it('moves a category among its siblings, renumbering ties, and no-ops at the edge', function (): void {
    [$token, $ws] = kbAuthWorld();
    $a = kbAuthCategory($ws, ['slug' => 'a', 'name' => 'A', 'position' => 0]);
    $b = kbAuthCategory($ws, ['slug' => 'b', 'name' => 'B', 'position' => 0]); // tie — seeded data has these
    $c = kbAuthCategory($ws, ['slug' => 'c', 'name' => 'C', 'position' => 0]);

    $this->withToken($token)->postJson("/v1/kb/categories/{$c->id}/move", ['direction' => 'up'])->assertStatus(200);
    expect([$a->refresh()->position, $c->refresh()->position, $b->refresh()->position])->toBe([0, 1, 2]);
    $this->withToken($token)->postJson("/v1/kb/categories/{$a->id}/move", ['direction' => 'up'])->assertStatus(200);
    expect($a->refresh()->position)->toBe(0);
    $this->withToken($token)->postJson("/v1/kb/categories/{$a->id}/move", ['direction' => 'sideways'])->assertStatus(422);
});

it('deletes a category cascading its sections and articles', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $cat = kbAuthCategory($ws);
    $sec = kbAuthSection($cat);
    kbAuthArticle($sec, $user);

    $this->withToken($token)->deleteJson("/v1/kb/categories/{$cat->id}")->assertStatus(204);
    expect(KbSection::query()->whereKey($sec->id)->exists())->toBeFalse();
    expect(KbArticle::query()->withTrashed()->where('section_id', $sec->id)->exists())->toBeFalse();
});

it('bulk-archives the non-archived articles under a category', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $cat = kbAuthCategory($ws);
    $sec = kbAuthSection($cat);
    kbAuthArticle($sec, $user, ['slug' => 'p1']);
    kbAuthArticle($sec, $user, ['slug' => 'd1', 'status' => 'draft', 'published_at' => null]);
    kbAuthArticle($sec, $user, ['slug' => 'a1', 'status' => 'archived']);

    $res = $this->withToken($token)->postJson("/v1/kb/categories/{$cat->id}/archive-articles")->assertStatus(200);
    expect($res->json('data.archived'))->toBe(2);
    expect(KbArticle::query()->where('section_id', $sec->id)->where('status', 'archived')->count())->toBe(3);
});
