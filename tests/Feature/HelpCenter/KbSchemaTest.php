<?php

declare(strict_types=1);

use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\KbSection;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('has the new category columns and the article search index', function (): void {
    $cols = collect(DB::select("select column_name from information_schema.columns where table_name = 'kb_categories'"))->pluck('column_name');
    expect($cols)->toContain('description')->toContain('icon')->toContain('color');

    $search = collect(DB::select("select column_name, is_generated from information_schema.columns where table_name = 'kb_articles' and column_name = 'search'"));
    expect($search)->toHaveCount(1);
    expect($search->first()->is_generated)->toBe('ALWAYS');

    $indexes = collect(DB::select("select indexname from pg_indexes where tablename = 'kb_articles'"))->pluck('indexname');
    expect($indexes)->toContain('idx_kb_articles_search');
});

it('enforces RLS on all five kb tables', function (): void {
    $rows = collect(DB::select(
        "select relname, relrowsecurity, relforcerowsecurity from pg_class where relname in ('kb_categories','kb_sections','kb_articles','kb_article_versions','kb_article_translations')"
    ));
    expect($rows)->toHaveCount(5);
    foreach ($rows as $r) {
        expect($r->relrowsecurity)->toBeTrue();
        expect($r->relforcerowsecurity)->toBeTrue();
    }
});

it('hides another workspace\'s kb rows through RLS + scoping', function (): void {
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $author = User::factory()->for($ws, 'workspace')->create();
    $cat = KbCategory::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Mine', 'slug' => 'mine']);
    $sec = KbSection::forceCreate(['id' => (string) Str::uuid(), 'category_id' => $cat->id, 'name' => 'S', 'slug' => 's']);
    KbArticle::forceCreate(['id' => (string) Str::uuid(), 'section_id' => $sec->id, 'author_id' => $author->id, 'title' => 'Mine A', 'slug' => 'mine-a', 'body' => 'x', 'status' => 'published', 'published_at' => now()]);

    Workspace::forgetCurrent();
    $other = Workspace::factory()->create();
    $other->makeCurrent();

    expect(KbCategory::query()->count())->toBe(0); // WorkspaceScope
    // RLS bites the child tables even on raw queries under the other tenant's GUC:
    expect(DB::table('kb_sections')->count())->toBe(0);
    expect(DB::table('kb_articles')->count())->toBe(0);

    Workspace::forgetCurrent();
});
