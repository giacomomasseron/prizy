<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\KbArticle;
use App\Models\KbArticleTranslation;
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
}
