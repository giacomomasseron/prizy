<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;

final class DeleteKbArticle
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    public function handle(User $actor, string $id): void
    {
        HelpdeskAccess::gate($actor);
        $article = $this->kb->findArticle($id);
        abort_unless($article !== null, 404);
        $this->kb->deleteArticle($article);
    }
}
