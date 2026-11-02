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
 * Class IssueBlocker
 *
 * @property string $blocking_issue_id
 * @property string $blocked_issue_id
 * @property string $created_by
 * @property Carbon $created_at
 * @property Issue $blockedIssue
 * @property Issue $blockingIssue
 * @property User $user
 */
#[Table(
    name: 'issue_blockers',
    key: 'blocking_issue_id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['blocking_issue_id', 'blocked_issue_id', 'created_by'])]
class IssueBlocker extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'blocking_issue_id' => 'string',
            'blocked_issue_id' => 'string',
            'created_by' => 'string',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Issue, $this>
     */
    public function blockedIssue(): BelongsTo
    {
        return $this->belongsTo(Issue::class, 'blocked_issue_id', 'id');
    }

    /**
     * @return BelongsTo<Issue, $this>
     */
    public function blockingIssue(): BelongsTo
    {
        return $this->belongsTo(Issue::class, 'blocking_issue_id', 'id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }
}
