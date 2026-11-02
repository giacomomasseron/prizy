<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class ProjectMember
 *
 * @property string $project_id
 * @property string $user_id
 * @property Carbon $created_at
 * @property Project $project
 * @property User $user
 */
#[Table(
    name: 'project_members',
    key: 'project_id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['project_id', 'user_id'])]
class ProjectMember extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'project_id' => 'string',
            'user_id' => 'string',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id', 'id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
