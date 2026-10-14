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
 * An issue on a user's day plan (the Today v2 design): private to its user, ordered by a fractional position, with
 * the user's own time estimate in minutes. `previous_status` is the status the issue had when the user completed it
 * from the plan, so Undo can put it back.
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $user_id
 * @property string $issue_id
 * @property float $position
 * @property int $minutes
 * @property string|null $previous_status
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Issue|null $issue
 */
#[Table(name: 'user_plan_items', key: 'id', keyType: 'string', incrementing: false, timestamps: true)]
#[Connection('pgsql')]
#[Fillable(['user_id', 'issue_id', 'position', 'minutes', 'previous_status'])]
final class UserPlanItem extends TenantAwareEntity
{
    protected static function booted(): void
    {
        static::creating(function (self $item): void {
            if (empty($item->id)) {
                $item->id = (string) Str::uuid();
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
            'issue_id' => 'string',
            'position' => 'float',
            'minutes' => 'integer',
            'previous_status' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** The planned issue (soft-deleted issues are hidden). */
    public function issue(): BelongsTo
    {
        return $this->belongsTo(Issue::class, 'issue_id');
    }

    /**
     * Whether Undo can put the issue back: it is done, and that completion is the one the plan made — no later than
     * this item was last saved (Done saves it right after the status change). Someone who reopened the issue and
     * completed it again since owns that completion, so the kept status no longer applies.
     */
    public function canUndo(): bool
    {
        $completedAt = $this->issue?->completed_at;

        return $this->previous_status !== null && $this->issue?->status === 'done'
            && $completedAt !== null && $completedAt->lte($this->updated_at);
    }
}
