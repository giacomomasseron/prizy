<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Events\IssueUnblocked;
use App\Models\Issue;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueBlockerRepository;
use App\Repositories\IssueRepository;
use App\Services\NotificationDispatcher;
use Illuminate\Support\Facades\DB;

final class ResolveBlockersOnIssueCompleted
{
    public function __construct(
        private readonly IssueRepository $issues,
        private readonly IssueBlockerRepository $blockers,
        private readonly IssueActivityRepository $activities,
        private readonly NotificationDispatcher $dispatcher,
    ) {}

    /**
     * Standalone entry point: resolve in its own transaction, then dispatch the
     * unblock broadcasts AFTER commit.
     *
     * @param  string|null  $actorId  id of the user whose completion of $completed triggered this resolution
     * @return list<string> ids of issues that are now fully unblocked
     */
    public function handle(Issue $completed, ?string $actorId = null): array
    {
        $result = DB::transaction(fn (): array => $this->resolve($completed, $actorId));

        foreach ($result['events'] as $event) {
            event($event);
        }

        return $result['unblocked'];
    }

    /**
     * Perform the blocker-resolution DB writes for a completed issue WITHOUT
     * opening a transaction. Dispatches the (pref-gated) recipient
     * notifications synchronously via NotificationDispatcher, but returns the
     * newly-unblocked issue ids plus the IssueUnblocked domain events for the
     * caller to dispatch AFTER commit.
     *
     * Call this (not handle()) when composing inside an outer transaction
     * (e.g. TransitionIssueStatus), so the IssueUnblocked broadcast fires only
     * after the outer commit.
     *
     * @param  string|null  $actorId  id of the user whose completion of $completed triggered this resolution
     * @return array{unblocked: list<string>, events: list<IssueUnblocked>}
     */
    public function resolve(Issue $completed, ?string $actorId = null): array
    {
        $edges = $this->blockers->blocking($completed->id);

        $unblocked = [];
        $events = [];

        foreach ($edges as $edge) {
            $blockedId = $edge->blocked_issue_id;
            $this->blockers->delete($completed->id, $blockedId);
            $this->activities->log($blockedId, null, 'blocker_resolved', $completed->id, null);

            if ($this->blockers->blockersOf($blockedId)->isEmpty()) {
                $unblocked[] = $blockedId;

                $blocked = $this->issues->findInWorkspace($blockedId);
                if ($blocked !== null && $blocked->assignee_id !== null && $blocked->assignee_id !== $actorId) {
                    $this->dispatcher->dispatch($blocked->assignee_id, 'issue_unblocked', 'issue', $blocked->id, $actorId, $blocked->title);
                    $events[] = new IssueUnblocked($blocked, $blocked->assignee_id);
                }
            }
        }

        return ['unblocked' => $unblocked, 'events' => $events];
    }
}
