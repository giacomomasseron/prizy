<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\KbSection;
use App\Repositories\KbRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Str;

/**
 * Public help-center read — no actor: the pages are unauthenticated (CSAT precedent).
 */
final class ShowHelpArticle
{
    public function __construct(private readonly KbRepository $kb) {}

    /** @return array{article: KbArticle, category: KbCategory, section: KbSection, related: Collection<int, KbArticle>, html: string} */
    public function handle(string $categorySlug, string $sectionSlug, string $articleSlug): array
    {
        $chain = $this->kb->findArticleByChain($categorySlug, $sectionSlug, $articleSlug);
        if ($chain === null) {
            throw (new ModelNotFoundException)->setModel(KbArticle::class, [$articleSlug]);
        }

        $article = $chain['article'];
        $this->kb->recordView($article);

        return [
            'article' => $article,
            'category' => $chain['category'],
            'section' => $chain['section'],
            'related' => $this->kb->relatedArticles($article),
            // Safe-mode markdown: raw HTML in the body is escaped, not rendered —
            // this is the ONLY trusted producer of the article's `{!! !!}` output.
            'html' => Str::markdown($article->body, ['html_input' => 'escape', 'allow_unsafe_links' => false]),
        ];
    }
}
