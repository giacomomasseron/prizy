<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Events\IssueStatusChanged;
use App\Events\NotificationCreated;
use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueRepository;
use App\Repositories\NotificationRepository;
use App\Services\NotificationRecipients;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class TransitionIssueStatus
{
    private const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

    private const CLOSED = ['done', 'cancelled'];

    /** @var array<string, string> */
    private const STATUS_LABELS = [
        'backlog' => 'Backlog',
        'todo' => 'Todo',
        'in_progress' => 'In Progress',
        'in_review' => 'In Review',
        'done' => 'Done',
        'cancelled' => 'Cancelled',
    ];

    public function __construct(
        private readonly IssueRepository $issues,
        private readonly IssueActivityRepository $activities,
        private readonly ResolveBlockersOnIssueCompleted $resolveBlockers,
        private readonly NotificationRepository $notifications,
        private readonly NotificationRecipients $recipients,
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

        /** @var list<NotificationCreated> $notificationEvents */
        $notificationEvents = [];

        DB::transaction(function () use ($issue, $actor, $from, $to, &$unblockEvents, &$notificationEvents): void {
            $this->issues->update($issue, ['status' => $to]);
            $this->activities->log($issue->id, $actor->id, 'status_changed', $from, $to);

            if (in_array($to, self::CLOSED, true)) {
                $unblockEvents = $this->resolveBlockers->resolve($issue, $actor->id)['events'];
            }

            $notificationEvents = $this->notifyParticipants($issue, $actor, $to);
        });

        event(new IssueStatusChanged($issue, $from, $to));

        foreach ($unblockEvents as $event) {
            event($event);
        }

        foreach ($notificationEvents as $event) {
            event($event);
        }

        return $issue;
    }

    /** @return list<NotificationCreated> */
    private function notifyParticipants(Issue $issue, User $actor, string $to): array
    {
        $label = self::STATUS_LABELS[$to] ?? $to;

        $events = [];

        foreach ($this->recipients->participants($issue, $actor->id) as $userId) {
            $notification = $this->notifications->create($userId, 'issue_status_changed', 'issue', $issue->id, $actor->id, '→ '.$label);
            $events[] = new NotificationCreated($userId, $notification->id, 'issue_status_changed');
        }

        return $events;
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
