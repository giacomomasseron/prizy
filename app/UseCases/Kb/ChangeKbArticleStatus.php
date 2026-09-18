<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticle;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use Illuminate\Validation\ValidationException;

final class ChangeKbArticleStatus
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    /** @param 'draft'|'published'|'archived' $status */
    public function handle(User $actor, string $id, string $status): KbArticle
    {
        HelpdeskAccess::gate($actor);
        $article = $this->kb->findArticle($id);
        abort_unless($article !== null, 404);

        if ($article->status !== $status) {
            if ($status === 'published' && trim($article->body) === '') {
                throw ValidationException::withMessages(['status' => ['Add some content before publishing.']]);
            }
            $article->status = $status;
            // First publish only — an unpublish → republish keeps the original date.
            if ($status === 'published' && $article->published_at === null) {
                $article->published_at = now();
            }
            $article->save();
        }

        return $article;
    }
}
