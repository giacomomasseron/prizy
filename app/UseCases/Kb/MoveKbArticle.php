<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbArticle;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;

final class MoveKbArticle
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    public function handle(User $actor, string $id, string $direction): KbArticle
    {
        HelpdeskAccess::gate($actor);
        $article = $this->kb->findArticle($id);
        abort_unless($article !== null, 404);
        $this->kb->moveArticle($article, $direction);

        return $this->kb->findArticle($id);
    }
}
