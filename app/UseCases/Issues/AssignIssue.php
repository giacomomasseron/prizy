<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Events\IssueAssigned;
use App\Events\NotificationCreated;
use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueRepository;
use App\Repositories\NotificationRepository;
use App\UseCases\Issues\Concerns\ValidatesWorkspaceReferences;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class AssignIssue
{
    use ValidatesWorkspaceReferences;

    public function __construct(
        private readonly IssueRepository $issues,
        private readonly IssueActivityRepository $activities,
        private readonly NotificationRepository $notifications,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Issue
    {
        $issue = $this->issues->findInWorkspace((string) $data['issue_id']);

        if ($issue === null) {
            throw ValidationException::withMessages(['issue_id' => ['The selected issue is invalid.']]);
        }

        $assigneeId = $data['assignee_id'] ?? null;
        $this->assertAssigneeInWorkspace($assigneeId);

        $previous = $issue->assignee_id;

        if ($previous === $assigneeId) {
            return $issue;
        }

        $notif = null;

        DB::transaction(function () use ($issue, $actor, $assigneeId, $previous, &$notif): void {
            $this->issues->update($issue, ['assignee_id' => $assigneeId]);
            $this->activities->log($issue->id, $actor->id, 'assigned', $previous, $assigneeId);

            if ($assigneeId !== null) {
                $notif = $this->notifications->create($assigneeId, 'issue_assigned', 'issue', $issue->id, $actor->id, $issue->title);
            }
        });

        event(new IssueAssigned($issue, $assigneeId));

        if ($assigneeId !== null && $notif !== null) {
            event(new NotificationCreated($assigneeId, $notif->id, 'issue_assigned'));
        }

        return $issue;
    }
}
