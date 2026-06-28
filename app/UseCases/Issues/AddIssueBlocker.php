<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\IssueBlocker;
use App\Models\User;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueBlockerRepository;
use App\Repositories\IssueRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class AddIssueBlocker
{
    private const CLOSED = ['done', 'cancelled'];

    public function __construct(
        private readonly IssueRepository $issues,
        private readonly IssueBlockerRepository $blockers,
        private readonly IssueActivityRepository $activities,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): IssueBlocker
    {
        $blockingId = (string) $data['blocking_issue_id'];
        $blockedId  = (string) $data['blocked_issue_id'];

        if ($blockingId === $blockedId) {
            throw ValidationException::withMessages(['blocked_issue_id' => ['An issue cannot block itself.']]);
        }

        $blocking = $this->issues->findInWorkspace($blockingId);
        $blocked  = $this->issues->findInWorkspace($blockedId);

        if ($blocking === null || $blocked === null) {
            throw ValidationException::withMessages(['blocked_issue_id' => ['The selected issue is invalid.']]);
        }

        if (in_array($blocking->status, self::CLOSED, true) || in_array($blocked->status, self::CLOSED, true)) {
            throw ValidationException::withMessages(['blocked_issue_id' => ['Cannot add a blocker involving a done or cancelled issue.']]);
        }

        if ($this->blockers->exists($blockingId, $blockedId)) {
            throw ValidationException::withMessages(['blocked_issue_id' => ['This blocker already exists.']]);
        }

        if ($this->wouldCreateCycle($blockingId, $blockedId)) {
            throw ValidationException::withMessages(['blocked_issue_id' => ['This blocker would create a circular dependency.']]);
        }

        return DB::transaction(function () use ($actor, $blocking, $blocked): IssueBlocker {
            $edge = $this->blockers->create($blocking->id, $blocked->id, $actor->id);
            $this->activities->log($blocked->id, $actor->id, 'blocker_added', null, $blocking->id);

            return $edge;
        });
    }

    /**
     * Adding "blocking blocks blocked" closes a loop iff `blocked` can already
     * reach `blocking` by following existing blocks-edges. Iterative DFS.
     */
    private function wouldCreateCycle(string $blockingId, string $blockedId): bool
    {
        $stack   = [$blockedId];
        $visited = [];

        while ($stack !== []) {
            $node = array_pop($stack);

            if ($node === $blockingId) {
                return true;
            }
            if (isset($visited[$node])) {
                continue;
            }
            $visited[$node] = true;

            foreach ($this->blockers->blocking($node) as $edge) {
                $stack[] = $edge->blocked_issue_id;
            }
        }

        return false;
    }
}
