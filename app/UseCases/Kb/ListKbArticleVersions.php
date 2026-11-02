<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticleVersion;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbVersionRepository;
use App\Services\HelpdeskAccess;
use App\Services\KbVersionSummary;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method Collection run(User $actor, string $articleId)
 */
final class ListKbArticleVersions extends BaseUseCase implements UseCaseInterface
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbVersionRepository $versions,
    ) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return Collection<int, KbArticleVersion> newest first, each with `summary` and `is_current` attributes */
    private function execute(User $actor, string $articleId): Collection
    {
        HelpdeskAccess::gate($actor);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);

        $versions = $this->versions->listForArticle($article->id);
        foreach ($versions as $i => $version) {
            // The list is newest-first, so a version's predecessor is the NEXT entry.
            $version->setAttribute('summary', KbVersionSummary::between($version, $versions[$i + 1] ?? null));
            $version->setAttribute('is_current', $i === 0);
        }

        return $versions;
    }
}
