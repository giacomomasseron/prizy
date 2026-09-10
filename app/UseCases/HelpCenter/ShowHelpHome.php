<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Repositories\KbRepository;
use Illuminate\Database\Eloquent\Collection;

/**
 * Public help-center read — no actor: the pages are unauthenticated (CSAT precedent).
 */
final class ShowHelpHome
{
    public function __construct(private readonly KbRepository $kb) {}

    /** @return array{categories: Collection<int, KbCategory>, suggestions: Collection<int, KbArticle>} */
    public function handle(): array
    {
        $suggestions = $this->kb->topArticles();
        // Each chip links to the article's full slug chain, which needs its
        // parent section+category — eager-load here (2 queries total) so the
        // view isn't tempted into an N+1 over $article->section->category.
        $suggestions->load('section.category');

        return [
            'categories' => $this->kb->categoriesWithCounts(),
            'suggestions' => $suggestions,
        ];
    }
}
