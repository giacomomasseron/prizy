<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * A personal to-do (PRD §3.2.10): private to its user. Open to-dos are ordered by a fractional position; a done
 * to-do carries completed_at and keeps its position, so unticking it puts it back where it was.
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $user_id
 * @property string $body
 * @property string|null $issue_id
 * @property float $position
 * @property Carbon|null $completed_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Issue|null $issue
 */
#[Table(name: 'user_todos', key: 'id', keyType: 'string', incrementing: false, timestamps: true)]
#[Connection('pgsql')]
#[Fillable(['user_id', 'body', 'issue_id', 'position', 'completed_at'])]
final class UserTodo extends TenantAwareEntity
{
    protected static function booted(): void
    {
        static::creating(function (self $todo): void {
            if (empty($todo->id)) {
                $todo->id = (string) Str::uuid();
            }
        });
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'workspace_id' => 'string',
            'user_id' => 'string',
            'body' => 'string',
            'issue_id' => 'string',
            'position' => 'float',
            'completed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** The linked issue; null when there is none or it was deleted (soft-deleted issues are hidden). */
    public function issue(): BelongsTo
    {
        return $this->belongsTo(Issue::class, 'issue_id');
    }
}
