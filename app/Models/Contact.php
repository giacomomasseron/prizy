<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Auth\Authenticatable as AuthenticatableTrait;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Class Contact
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property string|null $external_id
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property Workspace $workspace
 * @property Collection|Ticket[] $ticketCcsTickets
 * @property Collection|User[] $ticketMessagesUsers
 * @property Collection|Ticket[] $ticketMessagesTickets
 * @property Collection|AgentGroup[] $ticketsAgentGroups
 * @property Collection|User[] $ticketsUsers
 * @property Collection|SlaPolicy[] $ticketsSlaPolicies
 * @property Collection|Workspace[] $ticketsWorkspaces
 * @property Collection|ContactMetadatum[] $contactMetadata
 * @property Collection|TicketCc[] $ticketCcs
 * @property Collection|TicketMessage[] $ticketMessages
 * @property Collection|Ticket[] $tickets
 */
#[Table(
    name: 'contacts',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'name', 'email', 'phone', 'external_id'])]
class Contact extends TenantAwareEntity implements AuthenticatableContract
{
    use AuthenticatableTrait;
    use SoftDeletes;

    /**
     * Contacts authenticate ONLY via emailed magic links — there is no
     * password column and no password path; the guard is entered exclusively
     * through Auth::guard('contact')->login().
     */
    public function getAuthPassword(): string
    {
        return '';
    }

    /**
     * The contacts table has no remember_token column — no-op the
     * remember-me machinery the Authenticatable trait otherwise assumes.
     */
    public function getRememberToken(): ?string
    {
        return null;
    }

    public function setRememberToken($value): void {}

    public function getRememberTokenName(): string
    {
        return '';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'workspace_id' => 'string',
            'name' => 'string',
            'email' => 'string',
            'phone' => 'string',
            'external_id' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<ContactMetadatum, $this>
     */
    public function contactMetadata(): HasMany
    {
        return $this->hasMany(ContactMetadatum::class, 'contact_id', 'id');
    }

    /**
     * @return HasMany<TicketCc, $this>
     */
    public function ticketCcs(): HasMany
    {
        return $this->hasMany(TicketCc::class, 'contact_id', 'id');
    }

    /**
     * @return HasMany<TicketMessage, $this>
     */
    public function ticketMessages(): HasMany
    {
        return $this->hasMany(TicketMessage::class, 'sender_contact_id', 'id');
    }

    /**
     * @return HasMany<Ticket, $this>
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'requester_id', 'id');
    }

    /**
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    /**
     * @return BelongsToMany<Ticket, $this>
     */
    public function ticketCcsTickets(): BelongsToMany
    {
        return $this->belongsToMany(Ticket::class, 'ticket_ccs', 'id', 'id')
            ->withPivot('contact_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function ticketMessagesUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'ticket_messages', 'id', 'id')
            ->withPivot('ticket_id', 'sender_type', 'sender_user_id', 'sender_contact_id', 'body', 'is_internal', 'channel', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Ticket, $this>
     */
    public function ticketMessagesTickets(): BelongsToMany
    {
        return $this->belongsToMany(Ticket::class, 'ticket_messages', 'id', 'id')
            ->withPivot('ticket_id', 'sender_type', 'sender_user_id', 'sender_contact_id', 'body', 'is_internal', 'channel', 'deleted_at')
            ->withTimestamps();
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
