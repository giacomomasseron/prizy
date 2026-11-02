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
 * Class SlaPolicy
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $name
 * @property int $first_reply_minutes
 * @property int|null $next_reply_minutes
 * @property int $resolution_minutes
 * @property string|null $schedule_id
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property BusinessHourSchedule $schedule
 * @property Workspace $workspace
 * @property Collection|AgentGroup[] $ticketsAgentGroups
 * @property Collection|User[] $ticketsUsers
 * @property Collection|Contact[] $ticketsContacts
 * @property Collection|Workspace[] $ticketsWorkspaces
 * @property Collection|Ticket[] $tickets
 */
#[Table(
    name: 'sla_policies',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'name', 'first_reply_minutes', 'next_reply_minutes', 'resolution_minutes', 'schedule_id'])]
class SlaPolicy extends TenantAwareEntity
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
            'first_reply_minutes' => 'integer',
            'next_reply_minutes' => 'integer',
            'resolution_minutes' => 'integer',
            'schedule_id' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<Ticket, $this>
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'sla_policy_id', 'id');
    }

    /**
     * @return BelongsTo<BusinessHourSchedule, $this>
     */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(BusinessHourSchedule::class, 'schedule_id');
    }

    /**
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    /**
     * @return BelongsToMany<AgentGroup, $this>
     */
    public function ticketsAgentGroups(): BelongsToMany
    {
        return $this->belongsToMany(AgentGroup::class, 'tickets', 'id', 'id')
            ->withPivot('workspace_id', 'requester_id', 'assignee_id', 'agent_group_id', 'sla_policy_id', 'subject', 'status', 'priority', 'channel', 'csat_rating', 'csat_responded_at', 'first_replied_at', 'resolved_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function ticketsUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'tickets', 'id', 'id')
            ->withPivot('workspace_id', 'requester_id', 'assignee_id', 'agent_group_id', 'sla_policy_id', 'subject', 'status', 'priority', 'channel', 'csat_rating', 'csat_responded_at', 'first_replied_at', 'resolved_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Contact, $this>
     */
    public function ticketsContacts(): BelongsToMany
    {
        return $this->belongsToMany(Contact::class, 'tickets', 'id', 'id')
            ->withPivot('workspace_id', 'requester_id', 'assignee_id', 'agent_group_id', 'sla_policy_id', 'subject', 'status', 'priority', 'channel', 'csat_rating', 'csat_responded_at', 'first_replied_at', 'resolved_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Workspace, $this>
     */
    public function ticketsWorkspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'tickets', 'id', 'id')
            ->withPivot('workspace_id', 'requester_id', 'assignee_id', 'agent_group_id', 'sla_policy_id', 'subject', 'status', 'priority', 'channel', 'csat_rating', 'csat_responded_at', 'first_replied_at', 'resolved_at', 'deleted_at')
            ->withTimestamps();
    }
}
