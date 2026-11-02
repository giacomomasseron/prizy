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
 * @method static KbArticleTranslation run(User $actor, string $articleId, string $locale, array $data)
 */
final class UpsertKbArticleTranslation extends BaseUseCase implements UseCaseInterface
{
    private readonly KbAuthoringRepository $kb;

    private readonly KbTranslationRepository $translations;

    public function handle(mixed ...$arguments): mixed
    {
        $this->kb = app(KbAuthoringRepository::class);
        $this->translations = app(KbTranslationRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array{title: string, body: string} $data */
    private function execute(User $actor, string $articleId, string $locale, array $data): KbArticleTranslation
    {
        HelpdeskAccess::gateWrite($actor);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);
        KbLocales::assertTranslatable($locale);

        // Status is never set here — a new row defaults to draft, and an existing
        // one keeps whatever status it had. Publishing goes through
        // ChangeKbTranslationStatus, which owns the guards.
        return $this->translations->upsert($article->id, $locale, [
            'title' => $data['title'],
            'body' => $data['body'],
        ]);
    }
}
