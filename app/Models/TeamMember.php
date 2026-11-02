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
 * Class TeamMember
 *
 * @property string $team_id
 * @property string $user_id
 * @property string $role
 * @property Carbon $created_at
 * @property Team $team
 * @property User $user
 */
#[Table(
    name: 'team_members',
    key: 'team_id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['team_id', 'user_id', 'role'])]
class TeamMember extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'team_id' => 'string',
            'user_id' => 'string',
            'role' => 'string',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id', 'id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
