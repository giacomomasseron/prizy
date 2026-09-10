<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\KbSection;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as BaseCollection;
use Illuminate\Support\Str;

final class KbRepository
{
    /**
     * THE public-visibility predicate. Every public query flows through here.
     *
     * @param  Builder<KbArticle>  $q
     * @return Builder<KbArticle>
     */
    private function published(Builder $q): Builder
    {
        // Columns qualified with the table name: several callers join
        // kb_sections/kb_categories onto this query, and an unqualified
        // `status`/`published_at` would become ambiguous (or silently bind to
        // the wrong table) the day either of those tables grows a same-named
        // column.
        return $q->where('kb_articles.status', 'published')->whereNotNull('kb_articles.published_at');
        // deleted_at handled by SoftDeletes' default scope on the model.
    }

    /** @return Builder<KbArticle> Articles reachable in the CURRENT workspace (chain subqueries). */
    private function workspaceArticles(): Builder
    {
        return KbArticle::query()->whereIn('section_id',
            KbSection::query()->select('id')->whereIn('category_id', KbCategory::query()->select('id'))
        );
    }

    /** @return Collection<int, KbCategory> categories with >0 published articles, position order, each with published_count attribute */
    public function categoriesWithCounts(): Collection
    {
        $counts = $this->published($this->workspaceArticles())
            ->join('kb_sections', 'kb_sections.id', '=', 'kb_articles.section_id')
            ->selectRaw('kb_sections.category_id, count(*) as c')
            ->groupBy('kb_sections.category_id')
            ->pluck('c', 'category_id');

        return KbCategory::query()->orderBy('position')->orderBy('name')->get()
            ->filter(fn (KbCategory $c): bool => ($counts[$c->id] ?? 0) > 0)
            ->each(fn (KbCategory $c) => $c->setAttribute('published_count', (int) $counts[$c->id]))
            ->values();
    }

    public function findCategoryBySlug(string $slug): ?KbCategory
    {
        return KbCategory::query()->where('slug', $slug)->first();
    }

    /** @return Collection<int, KbSection> sections (position order) each with a filtered `publishedArticles` attribute */
    public function sectionsWithArticles(KbCategory $category): Collection
    {
        $sections = KbSection::query()->where('category_id', $category->id)
            ->orderBy('position')->orderBy('name')->get();
        $articles = $this->published(KbArticle::query()->whereIn('section_id', $sections->pluck('id')))
            ->orderBy('position')->orderBy('title')
            ->get(['id', 'section_id', 'title', 'slug', 'updated_at']);
        $bySection = $articles->groupBy('section_id');
        $sections->each(fn (KbSection $s) => $s->setAttribute('published_articles', ($bySection[$s->id] ?? collect())->values()));

        return $sections->filter(fn (KbSection $s): bool => $s->published_articles->isNotEmpty())->values();
    }

    /**
     * One repository round trip for the full slug chain: matches the article by
     * slug while requiring its section/category slugs via whereHas (both relations
     * still carry KbSection/KbCategory's own global scopes, so cross-workspace
     * slugs never match — RLS is the backstop underneath), then eager-loads the
     * parent models so the use case needs no further lookups.
     *
     * @return array{category: KbCategory, section: KbSection, article: KbArticle}|null
     */
    public function findArticleByChain(string $categorySlug, string $sectionSlug, string $articleSlug): ?array
    {
        $article = $this->published(KbArticle::query())
            ->where('slug', $articleSlug)
            ->whereHas('section', function (Builder $q) use ($categorySlug, $sectionSlug): void {
                $q->where('slug', $sectionSlug)->whereHas('category', function (Builder $q) use ($categorySlug): void {
                    $q->where('slug', $categorySlug);
                });
            })
            ->with('section.category')
            ->first();

        if ($article === null) {
            return null;
        }

        return ['category' => $article->section->category, 'section' => $article->section, 'article' => $article];
    }

    public function findPublishedById(string $id): ?KbArticle
    {
        // `id` is a uuid column: a malformed (non-uuid) string reaching whereKey()
        // would make Postgres throw a type-cast error (500) before the query even
        // runs its WHERE clause — guard here so garbage input is just "not found"
        // (404 via the use case's ModelNotFoundException), same as any other id.
        if (! Str::isUuid($id)) {
            return null;
        }

        return $this->published($this->workspaceArticles())->whereKey($id)->first();
    }

    /** @return BaseCollection<int, object{id:string,title:string,slug:string,section_slug:string,category_slug:string,category_name:string,snippet:string}> */
    public function search(string $q, int $limit = 20): BaseCollection
    {
        return $this->published($this->workspaceArticles())
            ->join('kb_sections', 'kb_sections.id', '=', 'kb_articles.section_id')
            ->join('kb_categories', 'kb_categories.id', '=', 'kb_sections.category_id')
            ->whereRaw("kb_articles.search @@ websearch_to_tsquery('english', ?)", [$q])
            ->orderByRaw("ts_rank(kb_articles.search, websearch_to_tsquery('english', ?)) DESC", [$q])
            ->limit($limit)
            ->selectRaw(
                'kb_articles.id, kb_articles.title, kb_articles.slug, '
                .'kb_sections.slug as section_slug, kb_categories.slug as category_slug, kb_categories.name as category_name, '
                ."ts_headline('english', kb_articles.body, websearch_to_tsquery('english', ?), 'MaxWords=25, MinWords=15, StartSel=[[[, StopSel=]]]') as snippet",
                [$q]
            )
            ->get()
            ->map(fn ($r) => (object) $r->getAttributes());
    }

    /** @return Collection<int, KbArticle> most-viewed published (suggestion chips) */
    public function topArticles(int $limit = 4): Collection
    {
        return $this->published($this->workspaceArticles())
            ->orderByDesc('views_count')->limit($limit)->get(['id', 'title', 'slug', 'section_id']);
    }

    /** @return Collection<int, KbArticle> same-section, most-viewed, excluding the article */
    public function relatedArticles(KbArticle $article, int $limit = 3): Collection
    {
        return $this->published(KbArticle::query()->where('section_id', $article->section_id))
            ->whereKeyNot($article->id)
            ->orderByDesc('views_count')->limit($limit)->get(['id', 'title', 'slug', 'section_id']);
    }

    public function recordView(KbArticle $article): void
    {
        // increment() calls save(), and save() unconditionally re-stamps
        // updated_at via updateTimestamps() — including here, where it would
        // rewrite the "Updated {date}" the article page renders on every
        // anonymous pageview. Disabling timestamps for this one write is the
        // reliable fix: passing the old value back through the `$extra` array
        // does NOT work, because Eloquent only re-stamps a column when it is
        // NOT already dirty, so an unchanged value gets stamped fresh anyway.
        $article->timestamps = false;
        $article->increment('views_count');
    }

    public function recordFeedback(KbArticle $article, bool $helpful): void
    {
        // Same updated_at-preservation concern as recordView() above.
        $article->timestamps = false;
        $article->increment($helpful ? 'helpful_count' : 'unhelpful_count');
    }
}
