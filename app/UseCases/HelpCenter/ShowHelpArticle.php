<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\KbSection;
use App\Repositories\KbRepository;
use App\Services\MarkdownRenderer;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Public help-center read — no actor: the pages are unauthenticated (CSAT precedent).
 */
final class ShowHelpArticle
{
    public function __construct(private readonly KbRepository $kb, private readonly MarkdownRenderer $markdown) {}

    /** @return array{article: KbArticle, category: KbCategory, section: KbSection, related: Collection<int, KbArticle>, html: string}|array{redirect: string} */
    public function handle(string $categorySlug, string $sectionSlug, string $articleSlug): array
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

        return [
            'article' => $article,
            'category' => $chain['category'],
            'section' => $chain['section'],
            'related' => $this->kb->relatedArticles($article),
            // MarkdownRenderer is the ONLY trusted producer of the article's `{!! !!}` output.
            'html' => $this->markdown->render($article->body),
        ];
    }
}
