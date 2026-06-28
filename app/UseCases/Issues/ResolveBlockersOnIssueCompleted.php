<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Events\IssueUnblocked;
use App\Models\Issue;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueBlockerRepository;
use App\Repositories\IssueRepository;
use App\Repositories\NotificationRepository;
use Illuminate\Support\Facades\DB;

final class ResolveBlockersOnIssueCompleted
{
    public function __construct(
        private readonly IssueRepository $issues,
        private readonly IssueBlockerRepository $blockers,
        private readonly IssueActivityRepository $activities,
        private readonly NotificationRepository $notifications,
    ) {}

    /**
     * Drop the completed issue as a blocker everywhere and notify assignees of
     * issues that become fully unblocked.
     *
     * @return list<string> ids of issues that are now fully unblocked
     */
    public function handle(Issue $completed): array
    {
        $edges = $this->blockers->blocking($completed->id);

        if ($edges->isEmpty()) {
            return [];
        }

        $newlyUnblocked = [];

        $toNotify = DB::transaction(function () use ($completed, $edges, &$newlyUnblocked): array {
            $notify = [];

            foreach ($edges as $edge) {
                $blockedId = $edge->blocked_issue_id;
                $this->blockers->delete($completed->id, $blockedId);
                $this->activities->log($blockedId, null, 'blocker_resolved', $completed->id, null);

                if ($this->blockers->blockersOf($blockedId)->isEmpty()) {
                    $newlyUnblocked[] = $blockedId;

                    $blocked = $this->issues->findInWorkspace($blockedId);
                    if ($blocked !== null && $blocked->assignee_id !== null) {
                        $this->notifications->create($blocked->assignee_id, 'issue_unblocked', 'issue', $blocked->id);
                        $notify[] = $blocked;
                    }
                }
            }

            return $notify;
        });

        foreach ($toNotify as $blocked) {
            event(new IssueUnblocked($blocked, $blocked->assignee_id));
        }

        return $newlyUnblocked;
    }
}
