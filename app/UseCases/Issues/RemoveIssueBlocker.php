<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\User;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueBlockerRepository;
use App\Repositories\IssueRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class RemoveIssueBlocker
{
    public function __construct(
        private readonly IssueRepository $issues,
        private readonly IssueBlockerRepository $blockers,
        private readonly IssueActivityRepository $activities,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): void
    {
        $blockingId = (string) $data['blocking_issue_id'];
        $blockedId  = (string) $data['blocked_issue_id'];

        // Scope check: the blocked issue must be in the current workspace.
        if ($this->issues->findInWorkspace($blockedId) === null) {
            throw ValidationException::withMessages(['blocked_issue_id' => ['The selected issue is invalid.']]);
        }

        // Defense-in-depth: validate the blocking endpoint is also in the current workspace.
        if ($this->issues->findInWorkspace($blockingId) === null) {
            throw ValidationException::withMessages(['blocking_issue_id' => ['The selected issue is invalid.']]);
        }

        if (! $this->blockers->exists($blockingId, $blockedId)) {
            throw ValidationException::withMessages(['blocked_issue_id' => ['This blocker does not exist.']]);
        }

        DB::transaction(function () use ($actor, $blockingId, $blockedId): void {
            $this->blockers->delete($blockingId, $blockedId);
            $this->activities->log($blockedId, $actor->id, 'blocker_removed', null, $blockingId);
        });
    }
}
