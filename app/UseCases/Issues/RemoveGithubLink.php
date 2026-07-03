<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\User;
use App\Repositories\GithubLinkRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class RemoveGithubLink
{
    public function __construct(private readonly GithubLinkRepository $links) {}

    public function handle(User $actor, string $issueId, string $linkId): void
    {
        $link = $this->links->findInIssue($issueId, $linkId);
        if ($link === null) {
            throw new ModelNotFoundException();
        }
        $this->links->delete($link);
    }
}
