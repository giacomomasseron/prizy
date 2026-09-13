<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticleTranslation;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbTranslationRepository;

final class ShowKbArticleTranslation
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbTranslationRepository $translations,
    ) {}

    public function handle(User $actor, string $articleId, string $locale): KbArticleTranslation
    {
        abort_unless($actor->is_agent, 403);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);
        UpsertKbArticleTranslation::assertTranslatable($locale);

        $translation = $this->translations->find($article->id, $locale);
        abort_unless($translation !== null, 404);

        return $translation;
    }
}
