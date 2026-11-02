<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Events\IssueUnblocked;
use App\Events\NotificationCreated;
use App\Models\Issue;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueBlockerRepository;
use App\Repositories\IssueRepository;
use App\UseCases\Notifications\NotificationDispatcher;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method array run(Issue $completed, ?string $actorId = null)
 */
final class ResolveBlockersOnIssueCompleted extends BaseUseCase implements UseCaseInterface
{
    public function __construct(
        private readonly IssueRepository $issues,
        private readonly IssueBlockerRepository $blockers,
        private readonly IssueActivityRepository $activities,
        private readonly NotificationDispatcher $notificationDispatcher,
    ) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /**
     * Perform the blocker-resolution DB writes for a completed issue WITHOUT
     * opening a transaction. Creates the (pref-gated) recipient notification
     * rows synchronously via NotificationDispatcher, but returns the
     * newly-unblocked issue ids plus the IssueUnblocked + NotificationCreated
     * events for the caller to dispatch AFTER commit.
     *
     * Its caller (TransitionIssueStatus) runs it inside its own transaction
     * and fires those broadcasts only after that commits.
     *
     * @param  string|null  $actorId  id of the user whose completion of $completed triggered this resolution
     * @return array{unblocked: list<string>, events: list<IssueUnblocked|NotificationCreated>}
     */
    private function execute(Issue $completed, ?string $actorId = null): array
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
                    $events[] = new IssueUnblocked($blocked, $blocked->assignee_id);

                    $notification = $this->notificationDispatcher->run($blocked->assignee_id, 'issue_unblocked', 'issue', $blocked->id, $actorId, $blocked->title, $blocked->team_id, $blocked->project_id);
                    if ($notification !== null) {
                        $events[] = new NotificationCreated($blocked->assignee_id, $notification->id, 'issue_unblocked');
                    }
                }
            }
        }

        return ['unblocked' => $unblocked, 'events' => $events];
    }
}
