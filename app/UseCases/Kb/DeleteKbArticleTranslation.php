<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbTranslationRepository;
use App\Services\HelpdeskAccess;

final class DeleteKbArticleTranslation
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbTranslationRepository $translations,
    ) {}

    public function handle(User $actor, string $articleId, string $locale): void
    {
        HelpdeskAccess::gate($actor);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);
        UpsertKbArticleTranslation::assertTranslatable($locale);

        $translation = $this->translations->find($article->id, $locale);
        abort_unless($translation !== null, 404);

        // Only this locale's row goes. The article and every other translation are
        // untouched — customers simply fall back to English for this language.
        $this->translations->delete($translation);
    }
}
