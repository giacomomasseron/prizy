<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\KbSection;
use App\Repositories\KbRepository;
use App\Repositories\KbTranslationRepository;
use App\Services\KbLocales;
use App\Services\MarkdownRenderer;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Public help-center read — no actor: the pages are unauthenticated (CSAT precedent).
 */
final class ShowHelpArticle
{
    public function __construct(
        private readonly KbRepository $kb,
        private readonly MarkdownRenderer $markdown,
        private readonly KbTranslationRepository $translations,
    ) {}

    /**
     * @return array{article: KbArticle, category: KbCategory, section: KbSection, related: Collection<int, KbArticle>,
     *               html: string, lang: string, title: string, updated_at: ?CarbonInterface, is_fallback: bool, available: list<string>}
     *         |array{redirect: string}
     */
    public function handle(string $categorySlug, string $sectionSlug, string $articleSlug, string $lang = KbLocales::SOURCE): array
    {
        $chain = $this->kb->findArticleByChain($categorySlug, $sectionSlug, $articleSlug);
        if ($chain === null) {
            $archivedIn = $this->kb->findArchivedByChain($categorySlug, $sectionSlug, $articleSlug);
            if ($archivedIn !== null) {
                return ['redirect' => route('help.topic', $archivedIn->slug)];
            }
            throw (new ModelNotFoundException)->setModel(KbArticle::class, [$articleSlug]);
        }

        $article = $chain['article'];
        $this->kb->recordView($article);

        // Only a PUBLISHED translation reaches a customer. A draft or archived one
        // is indistinguishable from a missing one, by design.
        $translation = $lang === KbLocales::SOURCE
            ? null
            : $this->translations->findPublished($article->id, $lang);

        // The "Related articles" list is the other place titles show up on this
        // page — leaving it in English while the body is translated would be a
        // visible inconsistency on the page most likely to be read translated.
        $related = $this->kb->relatedArticles($article);
        $this->translations->applyDisplayTitles($related, $lang);

        return [
            'article' => $article,
            'category' => $chain['category'],
            'section' => $chain['section'],
            'related' => $related,
            'lang' => $lang,
            'title' => $translation?->title ?? $article->title,
            // MarkdownRenderer is the ONLY trusted producer of the `{!! !!}` output,
            // for translated bodies exactly as for English ones.
            'html' => $this->markdown->render($translation?->body ?? $article->body),
            // The translation's own date — "updated today" over text translated
            // months ago would be a lie.
            'updated_at' => $translation?->updated_at ?? $article->updated_at,
            'is_fallback' => $lang !== KbLocales::SOURCE && $translation === null,
            // Drives the switcher's per-article check / "English only" markers.
            'available' => $this->translations->publishedLocales($article->id),
        ];
    }
}
