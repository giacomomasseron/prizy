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
 * Class Project
 *
 * @property string $id
 * @property string $workspace_id
 * @property string|null $team_id
 * @property string $name
 * @property string|null $description
 * @property string|null $icon
 * @property string $color
 * @property string $status
 * @property Carbon|null $start_date
 * @property Carbon|null $target_date
 * @property string $created_by
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property User $user
 * @property Team $team
 * @property Workspace $workspace
 * @property Collection|User[] $issuesUsers
 * @property Collection|Cycle[] $issuesCycles
 * @property Collection|Issue[] $issuesIssues
 * @property Collection|Team[] $issuesTeams
 * @property Collection|Workspace[] $issuesWorkspaces
 * @property Collection|User[] $projectMembersUsers
 * @property Collection|Issue[] $issues
 * @property Collection|Milestone[] $milestones
 * @property Collection|ProjectMember[] $projectMembers
 */
#[Table(
    name: 'projects',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'workspace_id', 'team_id', 'name', 'description', 'icon', 'color', 'status', 'start_date', 'target_date', 'created_by'])]
class Project extends TenantAwareEntity
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
            'name' => 'string',
            'description' => 'string',
            'icon' => 'string',
            'color' => 'string',
            'status' => 'string',
            'start_date' => 'datetime',
            'target_date' => 'datetime',
            'created_by' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<Issue, $this>
     */
    public function issues(): HasMany
    {
        return $this->hasMany(Issue::class, 'project_id', 'id');
    }

    /**
     * @return HasMany<Milestone, $this>
     */
    public function milestones(): HasMany
    {
        return $this->hasMany(Milestone::class, 'project_id', 'id');
    }

    /**
     * @return HasMany<ProjectMember, $this>
     */
    public function projectMembers(): HasMany
    {
        return $this->hasMany(ProjectMember::class, 'project_id', 'id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
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
     * @return BelongsToMany<Issue, $this>
     */
    public function issuesIssues(): BelongsToMany
    {
        return $this->belongsToMany(Issue::class, 'issues', 'id', 'id')
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

    /**
     * @return BelongsToMany<User, $this>
     */
    public function projectMembersUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_members', 'id', 'id')
            ->withPivot('user_id', 'created_at');
    }
}
