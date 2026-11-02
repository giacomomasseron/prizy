<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbTranslationRepository;
use App\Services\HelpdeskAccess;
use App\Services\KbLocales;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static void run(User $actor, string $articleId, string $locale)
 */
final class DeleteKbArticleTranslation extends BaseUseCase implements UseCaseInterface
{
    private readonly KbAuthoringRepository $kb;

    private readonly KbTranslationRepository $translations;

    public function handle(mixed ...$arguments): mixed
    {
        $this->kb = app(KbAuthoringRepository::class);
        $this->translations = app(KbTranslationRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor, string $articleId, string $locale): void
    {
        HelpdeskAccess::gateWrite($actor);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);
        KbLocales::assertTranslatable($locale);

        $translation = $this->translations->find($article->id, $locale);
        abort_unless($translation !== null, 404);

        // Only this locale's row goes. The article and every other translation are
        // untouched — customers simply fall back to English for this language.
        $this->translations->delete($translation);
    }
}
