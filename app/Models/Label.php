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

/**
 * Class Label
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $name
 * @property string $color
 * @property ?string $group
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Workspace $workspace
 * @property Collection|Issue[] $issueLabelsIssues
 * @property Collection|IssueLabel[] $issueLabels
 */
#[Table(
    name: 'labels',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'name', 'color', 'group'])]
class Label extends TenantAwareEntity
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'workspace_id' => 'string',
            'name' => 'string',
            'color' => 'string',
            'group' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<IssueLabel, $this>
     */
    public function issueLabels(): HasMany
    {
        return $this->hasMany(IssueLabel::class, 'label_id', 'id');
    }

    /**
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    /**
     * @return BelongsToMany<Issue, $this>
     */
    public function issueLabelsIssues(): BelongsToMany
    {
        return $this->belongsToMany(Issue::class, 'issue_labels', 'id', 'id')
            ->withPivot('label_id');
    }
}
