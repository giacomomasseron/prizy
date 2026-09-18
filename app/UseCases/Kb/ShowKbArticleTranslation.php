<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticleTranslation;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbTranslationRepository;
use App\Services\HelpdeskAccess;

final class ShowKbArticleTranslation
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbTranslationRepository $translations,
    ) {}

    public function handle(User $actor, string $articleId, string $locale): KbArticleTranslation
    {
        HelpdeskAccess::gate($actor);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);
        UpsertKbArticleTranslation::assertTranslatable($locale);

        $translation = $this->translations->find($article->id, $locale);
        abort_unless($translation !== null, 404);

        return $translation;
    }
}
