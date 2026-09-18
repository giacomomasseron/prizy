<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticleVersion;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbVersionRepository;
use App\Services\HelpdeskAccess;
use Illuminate\Database\Eloquent\Collection;

final class ListKbArticleVersions
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbVersionRepository $versions,
    ) {}

    /** @return Collection<int, KbArticleVersion> newest first, each with `summary` and `is_current` attributes */
    public function handle(User $actor, string $articleId): Collection
    {
        HelpdeskAccess::gate($actor);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);

        $versions = $this->versions->listForArticle($article->id);
        foreach ($versions as $i => $version) {
            // The list is newest-first, so a version's predecessor is the NEXT entry.
            $version->setAttribute('summary', self::summaryFor($version, $versions[$i + 1] ?? null));
            $version->setAttribute('is_current', $i === 0);
        }

        return $versions;
    }

    /** The summary is derived, never stored — the table has no column for it. */
    public static function summaryFor(KbArticleVersion $version, ?KbArticleVersion $previous): string
    {
        if ($previous === null) {
            return 'Created';
        }
        $titleChanged = $version->title !== $previous->title;
        $bodyChanged = $version->body !== $previous->body;
        if ($titleChanged && $bodyChanged) {
            return 'Title and body';
        }
        if ($titleChanged) {
            return 'Title only';
        }

        return 'Body only';
    }
}
