<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;

/**
 * Class HelpdeskSavedView
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $name
 * @property string $created_by
 * @property array<string, mixed> $definition
 */
#[Table(
    name: 'helpdesk_saved_views',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'name', 'created_by', 'definition'])]
final class HelpdeskSavedView extends TenantAwareEntity
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
            'created_by' => 'string',
            'definition' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
