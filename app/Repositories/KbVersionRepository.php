<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\KbArticle;
use App\Models\KbArticleVersion;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

/**
 * Every read and write of kb_article_versions lives here — one repository,
 * one table. Authors are ALWAYS eager-loaded withTrashed(): members are
 * soft-deleted when removed from a workspace, and an unguarded author
 * dereference is precisely what broke HC-4's library for a whole workspace.
 */
final class KbVersionRepository
{
    /** Snapshot the article's CURRENT title and body as a new version. */
    public function recordVersion(KbArticle $article, User $author): void
    {
        KbArticleVersion::create([
            // orderedUuid(), not uuid(): two saves inside the same DB transaction
            // (every test, and any bulk/scripted edit) can share the exact same
            // `created_at` — Postgres freezes now() for the transaction's
            // lifetime. listForArticle()'s tie-break is orderByDesc('id'), which
            // only breaks ties correctly if id itself is chronologically
            // ordered; a random uuid() is not, silently reversing history.
            'id' => (string) Str::orderedUuid(),
            'article_id' => $article->id,
            'author_id' => $author->id,
            'title' => $article->title,
            'body' => $article->body,
        ]);
        // created_at is filled by the column default; the model has timestamps disabled.
    }

    /** @return Collection<int, KbArticleVersion> newest first */
    public function listForArticle(string $articleId): Collection
    {
        return KbArticleVersion::query()
            ->where('article_id', $articleId)
            ->with(['author' => fn ($q) => $q->withTrashed()])
            // id is the tie-break so ordering is deterministic when two rows
            // share a timestamp (a restore records immediately after a save).
            ->orderByDesc('created_at')->orderByDesc('id')
            ->get();
    }

    public function findForArticle(string $articleId, string $versionId): ?KbArticleVersion
    {
        return Str::isUuid($versionId)
            ? KbArticleVersion::query()->whereKey($versionId)->where('article_id', $articleId)
                ->with(['author' => fn ($q) => $q->withTrashed()])->first()
            : null;
    }

    public function newestIdForArticle(string $articleId): ?string
    {
        return KbArticleVersion::query()->where('article_id', $articleId)
            ->orderByDesc('created_at')->orderByDesc('id')->value('id');
    }
}
