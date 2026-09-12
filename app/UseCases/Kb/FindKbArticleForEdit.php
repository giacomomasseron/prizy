<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticle;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;

final class FindKbArticleForEdit
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    public function handle(User $actor, string $id): KbArticle
    {
        abort_unless($actor->is_agent, 403);
        $article = $this->kb->findArticle($id);
        abort_unless($article !== null, 404);

        return $article;
    }
}
