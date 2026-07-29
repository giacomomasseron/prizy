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
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Class Ticket
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $requester_id
 * @property string|null $assignee_id
 * @property string|null $agent_group_id
 * @property string|null $sla_policy_id
 * @property string $subject
 * @property string $status
 * @property string $priority
 * @property string $channel
 * @property string|null $csat_rating
 * @property Carbon|null $csat_responded_at
 * @property Carbon|null $first_replied_at
 * @property Carbon|null $resolved_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property AgentGroup $agentGroup
 * @property User $assignee
 * @property Contact $requester
 * @property SlaPolicy $slaPolicy
 * @property Workspace $workspace
 * @property Collection|User[] $issueTicketLinksUsers
 * @property Collection|Issue[] $issueTicketLinksIssues
 * @property Collection|Contact[] $ticketCcsContacts
 * @property Collection|Contact[] $ticketMessagesContacts
 * @property Collection|User[] $ticketMessagesUsers
 * @property Collection|Tag[] $ticketTagsTags
 * @property Collection|IssueTicketLink[] $issueTicketLinks
 * @property Collection|SlaBreach[] $slaBreaches
 * @property Collection|TicketCc[] $ticketCcs
 * @property Collection|TicketMessage[] $ticketMessages
 * @property Collection|TicketTag[] $ticketTags
 */
#[Table(
    name: 'tickets',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'requester_id', 'assignee_id', 'agent_group_id', 'sla_policy_id', 'subject', 'status', 'priority', 'channel', 'csat_rating', 'csat_responded_at', 'first_replied_at', 'resolved_at'])]
class Ticket extends TenantAwareEntity
{
    use SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'workspace_id' => 'string',
            'requester_id' => 'string',
            'assignee_id' => 'string',
            'agent_group_id' => 'string',
            'sla_policy_id' => 'string',
            'subject' => 'string',
            'status' => 'string',
            'priority' => 'string',
            'channel' => 'string',
            'csat_rating' => 'string',
            'csat_responded_at' => 'datetime',
            'first_replied_at' => 'datetime',
            'resolved_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<IssueTicketLink, $this>
     */
    public function issueTicketLinks(): HasMany
    {
        return $this->hasMany(IssueTicketLink::class, 'ticket_id', 'id');
    }

    /**
     * @return HasMany<SlaBreach, $this>
     */
    public function slaBreaches(): HasMany
    {
        return $this->hasMany(SlaBreach::class, 'ticket_id', 'id');
    }

    /**
     * @return HasMany<TicketCc, $this>
     */
    public function ticketCcs(): HasMany
    {
        return $this->hasMany(TicketCc::class, 'ticket_id', 'id');
    }

    /**
     * @return HasMany<TicketMessage, $this>
     */
    public function ticketMessages(): HasMany
    {
        return $this->hasMany(TicketMessage::class, 'ticket_id', 'id');
    }

    /**
     * The most recent non-internal message on the ticket (either party). Used to detect
     * a pending customer reply for the next-reply SLA. @return HasOne<TicketMessage, $this>
     */
    public function latestPublicMessage(): HasOne
    {
        return $this->hasOne(TicketMessage::class)->ofMany(
            ['created_at' => 'max'],
            fn ($q) => $q->where('is_internal', false),
        );
    }

    /**
     * @return HasMany<TicketTag, $this>
     */
    public function ticketTags(): HasMany
    {
        return $this->hasMany(TicketTag::class, 'ticket_id', 'id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'ticket_tags', 'ticket_id', 'tag_id');
    }

    public function linkedIssues(): BelongsToMany
    {
        return $this->belongsToMany(Issue::class, 'issue_ticket_links', 'ticket_id', 'issue_id');
    }

    /**
     * @return BelongsTo<AgentGroup, $this>
     */
    public function agentGroup(): BelongsTo
    {
        return $this->belongsTo(AgentGroup::class, 'agent_group_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    /**
     * @return BelongsTo<Contact, $this>
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'requester_id');
    }

    /**
     * @return BelongsTo<SlaPolicy, $this>
     */
    public function slaPolicy(): BelongsTo
    {
        return $this->belongsTo(SlaPolicy::class, 'sla_policy_id');
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
    public function issueTicketLinksUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'issue_ticket_links', 'id', 'id')
            ->withPivot('ticket_id', 'created_by', 'created_at');
    }

    /**
     * @return BelongsToMany<Issue, $this>
     */
    public function issueTicketLinksIssues(): BelongsToMany
    {
        return $this->belongsToMany(Issue::class, 'issue_ticket_links', 'id', 'id')
            ->withPivot('ticket_id', 'created_by', 'created_at');
    }

    /**
     * @return BelongsToMany<Contact, $this>
     */
    public function ticketCcsContacts(): BelongsToMany
    {
        return $this->belongsToMany(Contact::class, 'ticket_ccs', 'id', 'id')
            ->withPivot('contact_id');
    }

    /**
     * @return BelongsToMany<Contact, $this>
     */
    public function ticketMessagesContacts(): BelongsToMany
    {
        return $this->belongsToMany(Contact::class, 'ticket_messages', 'id', 'id')
            ->withPivot('ticket_id', 'sender_type', 'sender_user_id', 'sender_contact_id', 'body', 'is_internal', 'channel', 'deleted_at')
            ->withTimestamps();
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
     * @return BelongsToMany<Tag, $this>
     */
    public function ticketTagsTags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'ticket_tags', 'id', 'id')
            ->withPivot('tag_id');
    }
}
