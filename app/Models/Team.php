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
 * Class Team
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $name
 * @property string $identifier
 * @property string $color
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property Workspace $workspace
 * @property Collection|User[] $issuesUsers
 * @property Collection|Cycle[] $issuesCycles
 * @property Collection|Issue[] $issuesIssues
 * @property Collection|Project[] $issuesProjects
 * @property Collection|Workspace[] $issuesWorkspaces
 * @property Collection|User[] $projectsUsers
 * @property Collection|Workspace[] $projectsWorkspaces
 * @property Collection|User[] $teamMembersUsers
 * @property Collection|Cycle[] $cycles
 * @property Collection|Issue[] $issues
 * @property Collection|Project[] $projects
 * @property Collection|TeamMember[] $teamMembers
 */
#[Table(
    name: 'teams',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'workspace_id', 'name', 'identifier', 'color'])]
class Team extends TenantAwareEntity
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
            'name' => 'string',
            'identifier' => 'string',
            'color' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<Cycle, $this>
     */
    public function cycles(): HasMany
    {
        return $this->hasMany(Cycle::class, 'team_id', 'id');
    }

    /**
     * @return HasMany<Issue, $this>
     */
    public function issues(): HasMany
    {
        return $this->hasMany(Issue::class, 'team_id', 'id');
    }

    /**
     * @return HasMany<Project, $this>
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'team_id', 'id');
    }

    /**
     * @return HasMany<TeamMember, $this>
     */
    public function teamMembers(): HasMany
    {
        return $this->hasMany(TeamMember::class, 'team_id', 'id');
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
     * @return BelongsToMany<Project, $this>
     */
    public function issuesProjects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'issues', 'id', 'id')
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
    public function projectsUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'projects', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'name', 'description', 'icon', 'color', 'status', 'start_date', 'target_date', 'created_by', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Workspace, $this>
     */
    public function projectsWorkspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'projects', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'name', 'description', 'icon', 'color', 'status', 'start_date', 'target_date', 'created_by', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function teamMembersUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'team_members', 'id', 'id')
            ->withPivot('user_id', 'role', 'created_at');
    }
}
