<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticle;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Repositories\KbVersionRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Restoring copies a past version's title and body onto the article and
 * records the result as a NEW version. History is append-only: the version
 * being restored is never moved, rewritten or deleted.
 */
final class RestoreKbArticleVersion
{
    public function __construct(
        private readonly KbAuthoringRepository $kb,
        private readonly KbVersionRepository $versions,
    ) {}

    public function handle(User $actor, string $articleId, string $versionId): KbArticle
    {
        abort_unless($actor->is_agent, 403);
        $article = $this->kb->findArticle($articleId);
        abort_unless($article !== null, 404);
        $version = $this->versions->findForArticle($article->id, $versionId);
        abort_unless($version !== null, 404);

        if ($this->versions->newestIdForArticle($article->id) === $version->id) {
            throw ValidationException::withMessages(['version_id' => ['That version is already the current one.']]);
        }
        // Same content rule the editor enforces on save.
        if ($article->status === 'published' && trim($version->body) === '') {
            throw ValidationException::withMessages(['body' => ['A published article cannot be left empty.']]);
        }

        return DB::transaction(function () use ($actor, $article, $version): KbArticle {
            // Only title and body move: status, published_at, slug, section and
            // the article's original author are deliberately untouched.
            $updated = $this->kb->updateArticle($article, ['title' => $version->title, 'body' => $version->body]);
            $this->versions->recordVersion($updated, $actor);

            return $updated;
        });
    }
}
