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
 * Class AgentGroupMember
 *
 * @property string $agent_group_id
 * @property string $user_id
 * @property Carbon $created_at
 * @property AgentGroup $agentGroup
 * @property User $user
 */
#[Table(
    name: 'agent_group_members',
    key: 'agent_group_id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['agent_group_id', 'user_id'])]
class AgentGroupMember extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'agent_group_id' => 'string',
            'user_id' => 'string',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<AgentGroup, $this>
     */
    public function agentGroup(): BelongsTo
    {
        return $this->belongsTo(AgentGroup::class, 'agent_group_id', 'id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
