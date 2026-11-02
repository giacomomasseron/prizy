<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\User;
use App\Repositories\GithubLinkRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method Collection run(User $actor, string $issueId)
 */
final class ListGithubLinks extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly GithubLinkRepository $links) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(User $actor, string $issueId): Collection
    {
        return $this->links->forIssue($issueId);
    }
}
