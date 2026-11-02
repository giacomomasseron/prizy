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
 * Class TicketAttachment
 *
 * @property string $id
 * @property string $message_id
 * @property string $filename
 * @property string $mime_type
 * @property int $size_bytes
 * @property string $storage_key
 * @property Carbon $created_at
 * @property TicketMessage $message
 */
#[Table(
    name: 'ticket_attachments',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'message_id', 'filename', 'mime_type', 'size_bytes', 'storage_key'])]
class TicketAttachment extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'message_id' => 'string',
            'filename' => 'string',
            'mime_type' => 'string',
            'size_bytes' => 'integer',
            'storage_key' => 'string',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<TicketMessage, $this>
     */
    public function message(): BelongsTo
    {
        return $this->belongsTo(TicketMessage::class, 'message_id');
    }
}
