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
 * @method array run(User $actor, string $articleId)
 */
final class ListKbArticleTranslations extends BaseUseCase implements UseCaseInterface
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbTranslationRepository $translations,
    ) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /**
     * One entry per supported locale — including the ones with no translation,
     * because the gaps are the point of the card. English is shaped differently:
     * it has no translation row at all, so its status is always null.
     *
     * @return list<array{locale: string, name: string, is_source: bool, status: ?string, updated_at: ?string, stale: bool}>
     */
    private function execute(User $actor, string $articleId): array
    {
        HelpdeskAccess::gate($actor);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);

        $rows = $this->translations->forArticle($article->id)->keyBy('locale');

        $out = [];
        foreach (KbLocales::CODES as $code) {
            $isSource = $code === KbLocales::SOURCE;
            $row = $isSource ? null : ($rows[$code] ?? null);

            $out[] = [
                'locale' => $code,
                'name' => (string) KbLocales::name($code),
                'is_source' => $isSource,
                // null means "no translation row" — the card renders that as
                // "Not translated". No separate exists flag: two fields encoding
                // one fact eventually disagree.
                'status' => $row?->status,
                'updated_at' => $row?->updated_at?->toIso8601String(),
                // Derived, never stored.
                'stale' => $row !== null
                    && $article->updated_at !== null
                    && $row->updated_at !== null
                    && $row->updated_at->lt($article->updated_at),
            ];
        }

        return $out;
    }
}
