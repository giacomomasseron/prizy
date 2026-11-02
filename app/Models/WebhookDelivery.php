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
 * Class WebhookDelivery
 *
 * @property string $id
 * @property string $webhook_id
 * @property string $event
 * @property string $payload
 * @property int|null $http_status
 * @property int $attempt
 * @property Carbon|null $delivered_at
 * @property Carbon|null $next_retry_at
 * @property Carbon $created_at
 * @property Webhook $webhook
 */
#[Table(
    name: 'webhook_deliveries',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'webhook_id', 'event', 'payload', 'http_status', 'attempt', 'delivered_at', 'next_retry_at'])]
class WebhookDelivery extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'webhook_id' => 'string',
            'event' => 'string',
            'payload' => 'string',
            'http_status' => 'integer',
            'attempt' => 'integer',
            'delivered_at' => 'datetime',
            'next_retry_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Webhook, $this>
     */
    public function webhook(): BelongsTo
    {
        return $this->belongsTo(Webhook::class, 'webhook_id');
    }
}
