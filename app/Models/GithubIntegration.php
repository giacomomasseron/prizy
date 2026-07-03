<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;

/**
 * @property string $id
 * @property string $workspace_id
 * @property string $webhook_token
 * @property string|null $webhook_secret
 * @property bool $move_to_done_on_merge
 * @property bool $is_active
 */
#[Table(name: 'github_integrations', key: 'id', keyType: 'string', incrementing: false, timestamps: true)]
#[Connection('pgsql')]
#[Fillable(['id', 'webhook_token', 'webhook_secret', 'move_to_done_on_merge', 'is_active'])]
final class GithubIntegration extends TenantAwareEntity
{
    /** @var array<string, mixed> */
    protected $attributes = [
        'move_to_done_on_merge' => true,
        'is_active' => true,
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'id'                    => 'string',
            'workspace_id'          => 'string',
            'webhook_token'         => 'string',
            'webhook_secret'        => 'encrypted',
            'move_to_done_on_merge' => 'boolean',
            'is_active'             => 'boolean',
            'created_at'            => 'datetime',
            'updated_at'            => 'datetime',
        ];
    }
}
