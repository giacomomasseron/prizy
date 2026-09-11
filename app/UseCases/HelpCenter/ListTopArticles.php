<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Models\KbArticle;
use App\Repositories\KbRepository;
use Illuminate\Database\Eloquent\Collection;

/** Public read: the most-viewed published articles, eager-loaded for URL building. */
final class ListTopArticles
{
    public function __construct(private readonly KbRepository $kb) {}

    /** @return Collection<int, KbArticle> */
    public function handle(int $limit = 4): Collection
    {
        return $this->kb->topArticles($limit)->load('section.category');
    }
}
