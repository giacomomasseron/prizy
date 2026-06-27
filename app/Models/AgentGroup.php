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
 * Class AgentGroup
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $name
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Workspace $workspace
 * @property Collection|User[] $agentGroupMembersUsers
 * @property Collection|User[] $ticketsUsers
 * @property Collection|Contact[] $ticketsContacts
 * @property Collection|SlaPolicy[] $ticketsSlaPolicies
 * @property Collection|Workspace[] $ticketsWorkspaces
 * @property Collection|AgentGroupMember[] $agentGroupMembers
 * @property Collection|Ticket[] $tickets
 */
#[Table(
    name: 'agent_groups',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'name'])]
class AgentGroup extends TenantAwareEntity
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
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<AgentGroupMember, $this>
     */
    public function agentGroupMembers(): HasMany
    {
        return $this->hasMany(AgentGroupMember::class, 'agent_group_id', 'id');
    }

    /**
     * @return HasMany<Ticket, $this>
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'agent_group_id', 'id');
    }

    /**
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function agentGroupMembersUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'agent_group_members', 'id', 'id')
            ->withPivot('user_id', 'created_at');
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
     * @return BelongsToMany<SlaPolicy, $this>
     */
    public function ticketsSlaPolicies(): BelongsToMany
    {
        return $this->belongsToMany(SlaPolicy::class, 'tickets', 'id', 'id')
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
