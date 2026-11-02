<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class WebhookSubscription
 *
 * @property string $webhook_id
 * @property string $event
 * @property Webhook $webhook
 */
#[Table(
    name: 'webhook_subscriptions',
    key: 'webhook_id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['webhook_id', 'event'])]
class WebhookSubscription extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'webhook_id' => 'string',
            'event' => 'string',
        ];
    }

    /**
     * @return BelongsTo<Webhook, $this>
     */
    public function webhook(): BelongsTo
    {
        return $this->belongsTo(Webhook::class, 'webhook_id', 'id');
    }
}
