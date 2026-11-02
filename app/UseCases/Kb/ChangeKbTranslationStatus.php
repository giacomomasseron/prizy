<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticleTranslation;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbTranslationRepository;
use App\Services\HelpdeskAccess;
use App\Services\KbLocales;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method KbArticleTranslation run(User $actor, string $articleId, string $locale, string $status)
 */
final class ChangeKbTranslationStatus extends BaseUseCase implements UseCaseInterface
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbTranslationRepository $translations,
    ) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param 'draft'|'published'|'archived' $status */
    private function execute(User $actor, string $articleId, string $locale, string $status): KbArticleTranslation
    {
        HelpdeskAccess::gateWrite($actor);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);
        KbLocales::assertTranslatable($locale);

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
