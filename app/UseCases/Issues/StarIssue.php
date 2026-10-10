<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueStarRepository;
use Carbon\CarbonInterface;

/**
 * Star an issue for the actor (PRD §3.2.9). A star is the actor's own state, not a change to the issue: no
 * activity, no notification, no broadcast, and the issue's updated_at is untouched.
 */
final class StarIssue
{
    public function __construct(
        private readonly IssueStarRepository $stars,
    ) {}

    public function handle(User $actor, Issue $issue): CarbonInterface
    {
        return $this->stars->star($actor->id, $issue->id);
    }
}
