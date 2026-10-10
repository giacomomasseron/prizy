<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;

/**
 * A user's personal star on an issue (PRD §3.2.9): private to the user, scoped through the issue.
 * The table's key is (user_id, issue_id); rows are only read and written through query builders.
 *
 * @property string $user_id
 * @property string $issue_id
 * @property Carbon $created_at
 */
#[Table(name: 'issue_stars', key: 'issue_id', keyType: 'string', incrementing: false, timestamps: false)]
#[Connection('pgsql')]
#[Fillable(['user_id', 'issue_id', 'created_at'])]
class IssueStar extends Model
{
    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'user_id' => 'string',
            'issue_id' => 'string',
            'created_at' => 'datetime',
        ];
    }
}
