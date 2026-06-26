<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Class Issue
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $team_id
 * @property string|null $project_id
 * @property string|null $cycle_id
 * @property string|null $parent_issue_id
 * @property string|null $assignee_id
 * @property string $created_by
 * @property string $title
 * @property string|null $description
 * @property string $status
 * @property string $priority
 * @property int|null $estimate
 * @property Carbon|null $due_date
 * @property float $sort_order
 * @property Carbon|null $archived_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property User $assignee
 * @property User $user
 * @property Cycle $cycle
 * @property Issue $parentIssue
 * @property Project $project
 * @property Team $team
 * @property Workspace $workspace
 * @property Collection|User[] $issueActivitiesUsers
 * @property Collection|User[] $issueBlockersUsers
 * @property Collection|User[] $issueCommentsUsers
 * @property Collection|Label[] $issueLabelsLabels
 * @property Collection|User[] $issueTicketLinksUsers
 * @property Collection|Ticket[] $issueTicketLinksTickets
 * @property Collection|User[] $issuesUsers
 * @property Collection|Cycle[] $issuesCycles
 * @property Collection|Project[] $issuesProjects
 * @property Collection|Team[] $issuesTeams
 * @property Collection|Workspace[] $issuesWorkspaces
 * @property Collection|IssueActivity[] $issueActivities
 * @property Collection|IssueBlocker[] $issueBlockersAsBlockedIssue
 * @property Collection|IssueBlocker[] $issueBlockersAsBlockingIssue
 * @property Collection|IssueComment[] $issueComments
 * @property Collection|IssueLabel[] $issueLabels
 * @property Collection|IssueTicketLink[] $issueTicketLinks
 * @property Collection|Issue[] $issues
 */
#[Table(
    name: 'issues',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'workspace_id', 'team_id', 'project_id', 'cycle_id', 'parent_issue_id', 'assignee_id', 'created_by', 'title', 'description', 'status', 'priority', 'estimate', 'due_date', 'sort_order', 'archived_at'])]
class Issue extends TenantAwareEntity
{
    use SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'workspace_id' => 'string',
            'team_id' => 'string',
            'project_id' => 'string',
            'cycle_id' => 'string',
            'parent_issue_id' => 'string',
            'assignee_id' => 'string',
            'created_by' => 'string',
            'title' => 'string',
            'description' => 'string',
            'status' => 'string',
            'priority' => 'string',
            'estimate' => 'integer',
            'due_date' => 'datetime',
            'sort_order' => 'float',
            'archived_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<IssueActivity, $this>
     */
    public function issueActivities(): HasMany
    {
        return $this->hasMany(IssueActivity::class, 'issue_id', 'id');
    }

    /**
     * @return HasMany<IssueBlocker, $this>
     */
    public function issueBlockersAsBlockedIssue(): HasMany
    {
        return $this->hasMany(IssueBlocker::class, 'blocked_issue_id', 'id');
    }

    /**
     * @return HasMany<IssueBlocker, $this>
     */
    public function issueBlockersAsBlockingIssue(): HasMany
    {
        return $this->hasMany(IssueBlocker::class, 'blocking_issue_id', 'id');
    }

    /**
     * @return HasMany<IssueComment, $this>
     */
    public function issueComments(): HasMany
    {
        return $this->hasMany(IssueComment::class, 'issue_id', 'id');
    }

    /**
     * @return HasMany<IssueLabel, $this>
     */
    public function issueLabels(): HasMany
    {
        return $this->hasMany(IssueLabel::class, 'issue_id', 'id');
    }

    /**
     * @return HasMany<IssueTicketLink, $this>
     */
    public function issueTicketLinks(): HasMany
    {
        return $this->hasMany(IssueTicketLink::class, 'issue_id', 'id');
    }

    /**
     * @return HasMany<Issue, $this>
     */
    public function issues(): HasMany
    {
        return $this->hasMany(Issue::class, 'parent_issue_id', 'id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<Cycle, $this>
     */
    public function cycle(): BelongsTo
    {
        return $this->belongsTo(Cycle::class, 'cycle_id');
    }

    /**
     * @return BelongsTo<Issue, $this>
     */
    public function parentIssue(): BelongsTo
    {
        return $this->belongsTo(Issue::class, 'parent_issue_id');
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    /**
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function issueActivitiesUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'issue_activities', 'id', 'id')
            ->withPivot('issue_id', 'user_id', 'type', 'from_value', 'to_value', 'created_at');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function issueBlockersUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'issue_blockers', 'id', 'id')
            ->withPivot('blocked_issue_id', 'created_by', 'created_at');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function issueCommentsUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'issue_comments', 'id', 'id')
            ->withPivot('issue_id', 'user_id', 'body', 'is_internal', 'edited_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Label, $this>
     */
    public function issueLabelsLabels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class, 'issue_labels', 'id', 'id')
            ->withPivot('label_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function issueTicketLinksUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'issue_ticket_links', 'id', 'id')
            ->withPivot('ticket_id', 'created_by', 'created_at');
    }

    /**
     * @return BelongsToMany<Ticket, $this>
     */
    public function issueTicketLinksTickets(): BelongsToMany
    {
        return $this->belongsToMany(Ticket::class, 'issue_ticket_links', 'id', 'id')
            ->withPivot('ticket_id', 'created_by', 'created_at');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function issuesUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'issues', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'project_id', 'cycle_id', 'parent_issue_id', 'assignee_id', 'created_by', 'title', 'description', 'status', 'priority', 'estimate', 'due_date', 'sort_order', 'archived_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Cycle, $this>
     */
    public function issuesCycles(): BelongsToMany
    {
        return $this->belongsToMany(Cycle::class, 'issues', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'project_id', 'cycle_id', 'parent_issue_id', 'assignee_id', 'created_by', 'title', 'description', 'status', 'priority', 'estimate', 'due_date', 'sort_order', 'archived_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Project, $this>
     */
    public function issuesProjects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'issues', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'project_id', 'cycle_id', 'parent_issue_id', 'assignee_id', 'created_by', 'title', 'description', 'status', 'priority', 'estimate', 'due_date', 'sort_order', 'archived_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Team, $this>
     */
    public function issuesTeams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'issues', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'project_id', 'cycle_id', 'parent_issue_id', 'assignee_id', 'created_by', 'title', 'description', 'status', 'priority', 'estimate', 'due_date', 'sort_order', 'archived_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Workspace, $this>
     */
    public function issuesWorkspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'issues', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'project_id', 'cycle_id', 'parent_issue_id', 'assignee_id', 'created_by', 'title', 'description', 'status', 'priority', 'estimate', 'due_date', 'sort_order', 'archived_at', 'deleted_at')
            ->withTimestamps();
    }
}
