<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class Cycle
 *
 * @property string $id
 * @property string $team_id
 * @property string $name
 * @property Carbon $starts_at
 * @property Carbon $ends_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Team $team
 * @property Collection|User[] $issuesUsers
 * @property Collection|Issue[] $issuesIssues
 * @property Collection|Project[] $issuesProjects
 * @property Collection|Team[] $issuesTeams
 * @property Collection|Workspace[] $issuesWorkspaces
 * @property Collection|Issue[] $issues
 */
#[Table(
    name: 'cycles',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'team_id', 'name', 'starts_at', 'ends_at'])]
class Cycle extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'team_id' => 'string',
            'name' => 'string',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<Issue, $this>
     */
    public function issues(): HasMany
    {
        return $this->hasMany(Issue::class, 'cycle_id', 'id');
    }

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
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
