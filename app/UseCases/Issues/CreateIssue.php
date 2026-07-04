<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Events\IssueAssigned;
use App\Events\IssueCreated;
use App\Events\NotificationCreated;
use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueRepository;
use App\Repositories\NotificationRepository;
use App\UseCases\Issues\Concerns\ValidatesWorkspaceReferences;
use Illuminate\Support\Facades\DB;

final class CreateIssue
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
        $this->assertTeamInWorkspace((string) $data['team_id']);
        $this->assertAssigneeInWorkspace($data['assignee_id'] ?? null);
        $this->assertIssueInWorkspace($data['parent_issue_id'] ?? null, 'parent_issue_id');
        $this->assertProjectInWorkspace($data['project_id'] ?? null);
        $this->assertCycleInWorkspace($data['cycle_id'] ?? null);

        $notif = null;

        $issue = DB::transaction(function () use ($actor, $data, &$notif): Issue {
            $issue = $this->issues->create([
                'team_id'         => $data['team_id'],
                'title'           => $data['title'],
                'description'     => $data['description'] ?? null,
                'status'          => $data['status'] ?? 'backlog',
                'priority'        => $data['priority'] ?? 'no_priority',
                'estimate'        => $data['estimate'] ?? null,
                'due_date'        => $data['due_date'] ?? null,
                'project_id'      => $data['project_id'] ?? null,
                'cycle_id'        => $data['cycle_id'] ?? null,
                'parent_issue_id' => $data['parent_issue_id'] ?? null,
                'assignee_id'     => $data['assignee_id'] ?? null,
                'created_by'      => $actor->id,
            ]);

            $this->activities->log($issue->id, $actor->id, 'created', null, $issue->title);

            if ($issue->assignee_id !== null) {
                $notif = $this->notifications->create($issue->assignee_id, 'issue_assigned', 'issue', $issue->id);
            }

            return $issue;
        });

        event(new IssueCreated($issue));

        if ($issue->assignee_id !== null) {
            event(new IssueAssigned($issue, $issue->assignee_id));
            if ($notif !== null) {
                event(new NotificationCreated($issue->assignee_id, $notif->id, 'issue_assigned'));
            }
        }

        return $issue;
    }
}
