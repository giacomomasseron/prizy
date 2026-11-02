<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueStarRepository;
use Carbon\CarbonInterface;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * Star an issue for the actor (PRD §3.2.9). A star is the actor's own state, not a change to the issue: no
 * activity, no notification, no broadcast, and the issue's updated_at is untouched.
 *
 * @method static CarbonInterface run(User $actor, Issue $issue)
 */
final class StarIssue extends BaseUseCase implements UseCaseInterface
{
    private readonly IssueStarRepository $stars;

    public function handle(mixed ...$arguments): mixed
    {
        $this->stars = app(IssueStarRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(User $actor, Issue $issue): CarbonInterface
    {
        return $this->stars->star($actor->id, $issue->id);
    }
}
