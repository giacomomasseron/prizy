<?php

declare(strict_types=1);

use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

afterEach(fn () => Workspace::forgetCurrent());

it('returns the ordered tree with all statuses, author, counts and public_url only when published', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $c2 = kbAuthCategory($ws, ['slug' => 'second', 'name' => 'Second', 'position' => 1]);
    $c1 = kbAuthCategory($ws, ['position' => 0]);
    $s2 = kbAuthSection($c1, ['slug' => 'later', 'name' => 'Later', 'position' => 1]);
    $s1 = kbAuthSection($c1, ['position' => 0]);
    kbAuthArticle($s1, $user, ['slug' => 'pub', 'title' => 'Pub', 'position' => 1, 'views_count' => 7]);
    kbAuthArticle($s1, $user, ['slug' => 'draft', 'title' => 'Draft', 'position' => 0, 'status' => 'draft', 'published_at' => null]);
    kbAuthArticle($s2, $user, ['slug' => 'arch', 'title' => 'Arch', 'status' => 'archived']);

    $res = $this->withToken($token)->getJson('/v1/kb/library')->assertStatus(200);
    $cats = $res->json('data.categories');
    expect(collect($cats)->pluck('slug')->all())->toBe(['getting-started', 'second']);
    expect(collect($cats[0]['sections'])->pluck('slug')->all())->toBe(['basics', 'later']);
    $arts = $cats[0]['sections'][0]['articles'];
    expect(collect($arts)->pluck('slug')->all())->toBe(['draft', 'pub']);
    expect($arts[0]['public_url'])->toBeNull();
    expect($arts[1]['public_url'])->toEndWith('/help/getting-started/basics/pub');
    expect($arts[1]['author']['name'])->toBe($user->name);
    expect($arts[1]['views_count'])->toBe(7);
    expect($cats[0]['sections'][1]['articles'][0]['status'])->toBe('archived');
    expect($cats[1]['sections'])->toBe([]);
});

it('is workspace-scoped and agent-gated', function (): void {
    [$token, $ws] = kbAuthWorld();
    $other = Workspace::factory()->create();
    $other->makeCurrent();
    kbAuthCategory($other, ['slug' => 'foreign']);
    $ws->makeCurrent();
    expect($this->withToken($token)->getJson('/v1/kb/library')->json('data.categories'))->toBe([]);
    // EnsureValidTenantSession pins the tenant id into the session; the array
    // session driver leaks the previous tenant pin across same-test
    // cross-tenant calls (see TrackerReportTest). Flush before switching.
    test()->flushSession();
    [$nonAgent] = kbAuthWorld(['is_agent' => false, 'admin_level' => 'owner']);
    $this->withToken($nonAgent)->getJson('/v1/kb/library')->assertStatus(403);
});
