<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\KbArticle;
use App\Models\KbArticleTranslation;
use App\Models\KbCategory;
use App\Models\KbSection;
use App\Services\KbLocales;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as BaseCollection;
use Illuminate\Support\Str;

/**
 * Every read and write of kb_article_translations lives here — one repository,
 * one table. Callers always pass an article id that has ALREADY been resolved
 * through the workspace-scoped category chain, so these queries need no tenant
 * predicate of their own; RLS is the backstop beneath them.
 */
final class KbTranslationRepository
{
    /** @return Collection<int, KbArticleTranslation> every translation for one article */
    public function forArticle(string $articleId): Collection
    {
        return KbArticleTranslation::query()->where('article_id', $articleId)->get();
    }

    public function find(string $articleId, string $locale): ?KbArticleTranslation
    {
        return KbArticleTranslation::query()
            ->where('article_id', $articleId)->where('locale', $locale)->first();
    }

    /** The customer-facing lookup: drafts and archived translations are invisible. */
    public function findPublished(string $articleId, string $locale): ?KbArticleTranslation
    {
        return KbArticleTranslation::query()
            ->where('article_id', $articleId)->where('locale', $locale)
            ->where('status', 'published')->first();
    }

    /** @return list<string> the locales this article is actually published in — drives the switcher's per-article markers */
    public function publishedLocales(string $articleId): array
    {
        return KbArticleTranslation::query()
            ->where('article_id', $articleId)->where('status', 'published')
            ->pluck('locale')->all();
    }

    /**
     * Published translations for many articles in one locale, keyed by article id —
     * so a list page resolves every title in one query instead of N.
     *
     * @param  list<string>  $articleIds
     * @return Collection<string, KbArticleTranslation>
     */
    public function publishedForArticles(array $articleIds, string $locale): Collection
    {
        if ($articleIds === []) {
            return new Collection;
        }

        return KbArticleTranslation::query()
            ->whereIn('article_id', $articleIds)->where('locale', $locale)
            ->where('status', 'published')->get()->keyBy('article_id');
    }

    /**
     * Create or update the one row for (article, locale) — the unique constraint
     * makes the locale a natural key, so callers never branch on existence.
     *
     * The create path defaults title/body to '' because both columns are NOT
     * NULL. In practice only UpsertKbArticleTranslation creates rows and it
     * always supplies both; the status-change path 404s when no row exists.
     *
     * @param  array{title?: string, body?: string, status?: string}  $attrs
     */
    public function upsert(string $articleId, string $locale, array $attrs): KbArticleTranslation
    {
        $row = $this->find($articleId, $locale);
        if ($row === null) {
            return KbArticleTranslation::create($attrs + [
                'id' => (string) Str::uuid(),
                'article_id' => $articleId,
                'locale' => $locale,
                'title' => '',
                'body' => '',
                'status' => 'draft',
            ]);
        }
        if (! array_key_exists('title', $attrs) && ! array_key_exists('body', $attrs)) {
            // A status-only change (ChangeKbTranslationStatus) must not bump
            // updated_at: staleness is derived from translation.updated_at vs
            // the article's, and publishing a translation is not reviewing its
            // content. Same reasoning as KbRepository::recordView() disabling
            // timestamps so an anonymous pageview doesn't rewrite the article's
            // "Updated" date — a metadata-only write shouldn't restamp content.
            $row->timestamps = false;
        }
        $row->fill($attrs)->save();

        return $row->refresh();
    }

    public function delete(KbArticleTranslation $translation): void
    {
        $translation->delete();
    }

    /**
     * Overlay a display_title on each article: the published translation's title
     * when one exists, else the English one. ONE query for the whole page, never
     * one per row.
     *
     * Takes the base Collection rather than the Eloquent one: ShowHelpTopic hands
     * this the articles nested under sections via flatMap(), which degrades to a
     * plain Support Collection once the mapped values are themselves collections
     * rather than models. An Eloquent Collection satisfies this type too, so
     * every call site — home's, topic's flattened one, and article's related
     * list — works unchanged.
     *
     * @param  BaseCollection<int, KbArticle>  $articles
     */
    public function applyDisplayTitles(BaseCollection $articles, string $lang): void
    {
        if ($lang === KbLocales::SOURCE || $articles->isEmpty()) {
            $articles->each(fn (KbArticle $a) => $a->setAttribute('display_title', $a->title));

            return;
        }

        $byArticle = $this->publishedForArticles($articles->pluck('id')->all(), $lang);
        $articles->each(fn (KbArticle $a) => $a->setAttribute('display_title', $byArticle[$a->id]->title ?? $a->title));
    }

    /**
     * Published translations in one locale, ranked, shaped exactly like
     * KbRepository::search() rows so the two merge in the use case.
     *
     * $config is interpolated rather than bound because a regconfig cannot be a
     * bind parameter. It is safe precisely because KbLocales::regconfig() only
     * ever returns one of six literals — never user input.
     *
     * @return BaseCollection<int, object>
     */
    public function searchPublished(string $q, string $lang, int $limit = 20): BaseCollection
    {
        $config = KbLocales::regconfig($lang);

        return KbArticleTranslation::query()
            ->join('kb_articles', 'kb_articles.id', '=', 'kb_article_translations.article_id')
            ->join('kb_sections', 'kb_sections.id', '=', 'kb_articles.section_id')
            ->join('kb_categories', 'kb_categories.id', '=', 'kb_sections.category_id')
            // Mirrors KbRepository::workspaceArticles(): these subqueries carry
            // KbSection's and KbCategory's global scopes, so another workspace's
            // rows can never join in. RLS is the backstop beneath it.
            ->whereIn('kb_articles.section_id',
                KbSection::query()->select('id')->whereIn('category_id', KbCategory::query()->select('id'))
            )
            ->where('kb_article_translations.locale', $lang)
            ->where('kb_article_translations.status', 'published')
            ->where('kb_articles.status', 'published')
            ->whereNotNull('kb_articles.published_at')
            // This query starts from the translations model, so kb_articles'
            // SoftDeletes scope does NOT apply — without this a deleted article
            // would keep answering searches through its translations.
            ->whereNull('kb_articles.deleted_at')
            ->whereRaw("kb_article_translations.search @@ websearch_to_tsquery('{$config}', ?)", [$q])
            ->orderByRaw("ts_rank(kb_article_translations.search, websearch_to_tsquery('{$config}', ?)) DESC", [$q])
            ->limit($limit)
            ->selectRaw(
                'kb_articles.id, kb_article_translations.title, kb_articles.slug, '
                .'kb_sections.slug as section_slug, kb_categories.slug as category_slug, kb_categories.name as category_name, '
                ."ts_headline('{$config}', kb_article_translations.body, websearch_to_tsquery('{$config}', ?), 'MaxWords=25, MinWords=15, StartSel=[[[, StopSel=]]]') as snippet",
                [$q]
            )
            ->get()
            ->map(fn ($r) => (object) $r->getAttributes());
    }
}
