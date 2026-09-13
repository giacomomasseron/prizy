<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticleTranslation;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbTranslationRepository;
use Illuminate\Validation\ValidationException;

final class ChangeKbTranslationStatus
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbTranslationRepository $translations,
    ) {}

    /** @param 'draft'|'published'|'archived' $status */
    public function handle(User $actor, string $articleId, string $locale, string $status): KbArticleTranslation
    {
        abort_unless($actor->is_agent, 403);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);
        UpsertKbArticleTranslation::assertTranslatable($locale);

        $translation = $this->translations->find($article->id, $locale);
        abort_unless($translation !== null, 404);

        if ($status === 'published') {
            // A translation must never be more visible than the article it belongs to.
            if ($article->status !== 'published') {
                throw ValidationException::withMessages(['status' => ['Publish the English article first.']]);
            }
            if (trim($translation->body) === '') {
                throw ValidationException::withMessages(['status' => ['Add some content before publishing.']]);
            }
        }

        return $this->translations->upsert($article->id, $locale, ['status' => $status]);
    }
}
