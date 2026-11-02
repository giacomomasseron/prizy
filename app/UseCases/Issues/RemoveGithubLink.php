<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\User;
use App\Repositories\GithubLinkRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @method static void run(User $actor, string $issueId, string $linkId)
 */
final class RemoveGithubLink extends BaseUseCase implements UseCaseInterface
{
    private readonly GithubLinkRepository $links;

    public function handle(mixed ...$arguments): mixed
    {
        $this->links = app(GithubLinkRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor, string $issueId, string $linkId): void
    {
        $link = $this->links->findInIssue($issueId, $linkId);
        if ($link === null) {
            throw new ModelNotFoundException();
        }
        $this->links->delete($link);
    }
}
