<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Models\KbCategory;
use App\Models\KbSection;
use App\Repositories\KbRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Public help-center read — no actor: the pages are unauthenticated (CSAT precedent).
 */
final class ShowHelpTopic
{
    public function __construct(private readonly KbRepository $kb) {}

    /** @return array{category: KbCategory, sections: Collection<int, KbSection>} */
    public function handle(string $categorySlug): array
    {
        $category = $this->kb->findCategoryBySlug($categorySlug);
        if ($category === null) {
            throw (new ModelNotFoundException)->setModel(KbCategory::class, [$categorySlug]);
        }

        return [
            'category' => $category,
            'sections' => $this->kb->sectionsWithArticles($category),
        ];
    }
}
