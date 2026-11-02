<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;

/**
 * @property string $id
 * @property string $workspace_id
 * @property string|null $webhook_url
 * @property array<int, string> $events
 * @property bool $is_active
 */
#[Table(name: 'slack_integrations', key: 'id', keyType: 'string', incrementing: false, timestamps: true)]
#[Connection('pgsql')]
#[Fillable(['id', 'webhook_url', 'events', 'is_active'])]
final class SlackIntegration extends TenantAwareEntity
{

    /** @var array<string, mixed> */
    protected $attributes = [
        'events' => '["created","status_changed","assigned"]',
        'is_active' => true,
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'id'           => 'string',
            'workspace_id' => 'string',
            'webhook_url'  => 'encrypted',
            'events'       => 'array',
            'is_active'    => 'boolean',
            'created_at'   => 'datetime',
            'updated_at'   => 'datetime',
        ];
    }
}
