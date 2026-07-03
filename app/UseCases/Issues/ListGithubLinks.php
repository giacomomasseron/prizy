<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\User;
use App\Repositories\GithubLinkRepository;
use Illuminate\Database\Eloquent\Collection;

final class ListGithubLinks
{
    public function __construct(private readonly GithubLinkRepository $links) {}

    public function handle(User $actor, string $issueId): Collection
    {
        return $this->links->forIssue($issueId);
    }
}
