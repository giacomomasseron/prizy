<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Class TicketMessage
 *
 * @property string $id
 * @property string $ticket_id
 * @property string $sender_type
 * @property string|null $sender_user_id
 * @property string|null $sender_contact_id
 * @property string $body
 * @property bool $is_internal
 * @property string $channel
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property Contact $senderContact
 * @property User $senderUser
 * @property Ticket $ticket
 * @property Collection|TicketAttachment[] $ticketAttachments
 */
#[Table(
    name: 'ticket_messages',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'ticket_id', 'sender_type', 'sender_user_id', 'sender_contact_id', 'body', 'is_internal', 'channel'])]
class TicketMessage extends Model
{
    use SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'ticket_id' => 'string',
            'sender_type' => 'string',
            'sender_user_id' => 'string',
            'sender_contact_id' => 'string',
            'body' => 'string',
            'is_internal' => 'boolean',
            'channel' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<TicketAttachment, $this>
     */
    public function ticketAttachments(): HasMany
    {
        return $this->hasMany(TicketAttachment::class, 'message_id', 'id');
    }

    /**
     * @return BelongsTo<Contact, $this>
     */
    public function senderContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'sender_contact_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function senderUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }

    /**
     * @return BelongsTo<Ticket, $this>
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class, 'ticket_id');
    }
}
