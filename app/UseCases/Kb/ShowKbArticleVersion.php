<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticleVersion;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbVersionRepository;
use App\Services\HelpdeskAccess;
use App\Services\KbDiffer;
use App\Services\MarkdownRenderer;

final class ShowKbArticleVersion
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbVersionRepository $versions,
        private readonly MarkdownRenderer $markdown,
        private readonly KbDiffer $differ,
    ) {}

    /** @return array{version: KbArticleVersion, is_current: bool, summary: string, html: string, diff: array<string, mixed>|null} */
    public function handle(User $actor, string $articleId, string $versionId): array
    {
        HelpdeskAccess::gate($actor);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);

        // Load the list rather than the single row: it is small (tens of rows)
        // and yields BOTH the predecessor the summary is derived from and which
        // entry is current, without a second bespoke query. A version id from
        // another article — or a malformed one — simply is not in this list.
        $versions = $this->versions->listForArticle($article->id);
        $index = $versions->search(fn (KbArticleVersion $v): bool => $v->id === $versionId);
        abort_unless($index !== false, 404);

        $version = $versions[$index];
        $isCurrent = $index === 0;

        return [
            'version' => $version,
            'is_current' => $isCurrent,
            'summary' => ListKbArticleVersions::summaryFor($version, $versions[$index + 1] ?? null),
            // Rendered by the SAME renderer the public article page uses, so a
            // past version reads exactly as customers would have seen it.
            'html' => $this->markdown->render($version->body),
            // Compared against the article's SAVED state: the server cannot see
            // the editor's unsaved buffer.
            'diff' => $isCurrent ? null : $this->differ->diff($version->title, $version->body, $article->title, $article->body),
        ];
    }
}
