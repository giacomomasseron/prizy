<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Events\IssueStatusChanged;
use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class TransitionIssueStatus
{
    private const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

    private const CLOSED = ['done', 'cancelled'];

    public function __construct(
        private readonly IssueRepository $issues,
        private readonly IssueActivityRepository $activities,
        private readonly ResolveBlockersOnIssueCompleted $resolveBlockers,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Issue
    {
        $issue = $this->issues->findInWorkspace((string) $data['issue_id']);

        if ($issue === null) {
            throw ValidationException::withMessages(['issue_id' => ['The selected issue is invalid.']]);
        }

        $to = (string) $data['status'];

        if (! in_array($to, self::STATUSES, true)) {
            throw ValidationException::withMessages(['status' => ['The selected status is invalid.']]);
        }

        $from = $issue->status;
        $this->assertTransitionAllowed($from, $to);

        $unblockEvents = [];

        DB::transaction(function () use ($issue, $actor, $from, $to, &$unblockEvents): void {
            $this->issues->update($issue, ['status' => $to]);
            $this->activities->log($issue->id, $actor->id, 'status_changed', $from, $to);

            if (in_array($to, self::CLOSED, true)) {
                $unblockEvents = $this->resolveBlockers->resolve($issue)['events'];
            }
        });

        event(new IssueStatusChanged($issue, $from, $to));

        foreach ($unblockEvents as $event) {
            event($event);
        }

        return $issue;
    }

    /**
     * Single chokepoint for transition legality. Phase 1 forbids only the
     * no-op; a future state machine replaces this body without touching callers.
     */
    private function assertTransitionAllowed(string $from, string $to): void
    {
        if ($from === $to) {
            throw ValidationException::withMessages(['status' => ['The issue is already in that status.']]);
        }
    }
}
