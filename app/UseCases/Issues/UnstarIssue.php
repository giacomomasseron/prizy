<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueStarRepository;

/** Unstar an issue for the actor (PRD §3.2.9). Idempotent; no activity, notification or broadcast. */
final class UnstarIssue
{
    public function __construct(
        private readonly IssueStarRepository $stars,
    ) {}

    public function handle(User $actor, Issue $issue): void
    {
        $this->stars->unstar($actor->id, $issue->id);
    }
}
