<?php

declare(strict_types=1);

namespace App\UseCases\HelpCenter;

use App\Models\KbCategory;
use App\Models\KbSection;
use App\Repositories\KbRepository;
use App\Repositories\KbTranslationRepository;
use App\Services\KbLocales;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Public help-center read — no actor: the pages are unauthenticated (CSAT precedent).
 */
final class ShowHelpTopic
{
    public function __construct(
        private readonly KbRepository $kb,
        private readonly KbTranslationRepository $translations,
    ) {}

    /** @return array{category: KbCategory, sections: Collection<int, KbSection>, lang: string} */
    public function handle(string $categorySlug, string $lang = KbLocales::SOURCE): array
    {
        $category = $this->kb->findCategoryBySlug($categorySlug);
        if ($category === null) {
            throw (new ModelNotFoundException)->setModel(KbCategory::class, [$categorySlug]);
        }

        $sections = $this->kb->sectionsWithArticles($category);
        // Articles are nested under sections as published_articles — flatten
        // before the overlay so one repository call resolves every title.
        $this->translations->applyDisplayTitles($sections->flatMap(fn (KbSection $s) => $s->published_articles), $lang);

        return ['category' => $category, 'sections' => $sections, 'lang' => $lang];
    }
}
