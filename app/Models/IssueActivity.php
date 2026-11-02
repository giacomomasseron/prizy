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
 * Class IssueActivity
 *
 * @property string $id
 * @property string $issue_id
 * @property string|null $user_id
 * @property string $type
 * @property string|null $from_value
 * @property string|null $to_value
 * @property Carbon $created_at
 * @property Issue $issue
 * @property User $user
 */
#[Table(
    name: 'issue_activities',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'issue_id', 'user_id', 'type', 'from_value', 'to_value'])]
class IssueActivity extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'issue_id' => 'string',
            'user_id' => 'string',
            'type' => 'string',
            'from_value' => 'string',
            'to_value' => 'string',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Issue, $this>
     */
    public function issue(): BelongsTo
    {
        return $this->belongsTo(Issue::class, 'issue_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
