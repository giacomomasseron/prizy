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

/**
 * @method static KbArticleTranslation run(User $actor, string $articleId, string $locale)
 */
final class ShowKbArticleTranslation extends BaseUseCase implements UseCaseInterface
{
    private readonly KbAuthoringRepository $kb;

    private readonly KbTranslationRepository $translations;

    public function handle(mixed ...$arguments): mixed
    {
        $this->kb = app(KbAuthoringRepository::class);
        $this->translations = app(KbTranslationRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(User $actor, string $articleId, string $locale): KbArticleTranslation
    {
        HelpdeskAccess::gate($actor);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);
        KbLocales::assertTranslatable($locale);

        $translation = $this->translations->find($article->id, $locale);
        abort_unless($translation !== null, 404);

        return $translation;
    }
}
