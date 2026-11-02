<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class Release
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $name
 * @property string|null $description
 * @property Carbon|null $target_date
 * @property Carbon|null $shipped_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Collection|Issue[] $issues
 */
#[Table(name: 'releases', key: 'id', keyType: 'string', incrementing: false, timestamps: true)]
#[Connection('pgsql')]
#[Fillable(['id', 'name', 'description', 'target_date', 'shipped_at'])]
class Release extends TenantAwareEntity
{
    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'workspace_id' => 'string',
            'name' => 'string',
            'description' => 'string',
            'target_date' => 'date',
            'shipped_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** @return HasMany<Issue, $this> */
    public function issues(): HasMany
    {
        return $this->hasMany(Issue::class, 'release_id');
    }
}
