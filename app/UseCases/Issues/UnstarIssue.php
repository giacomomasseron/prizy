<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueStarRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * Unstar an issue for the actor (PRD §3.2.9). Idempotent; no activity, notification or broadcast.
 *
 * @method static void run(User $actor, Issue $issue)
 */
final class UnstarIssue extends BaseUseCase implements UseCaseInterface
{
    private readonly IssueStarRepository $stars;

    public function handle(mixed ...$arguments): mixed
    {
        $this->stars = app(IssueStarRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor, Issue $issue): void
    {
        $this->stars->unstar($actor->id, $issue->id);
    }
}
