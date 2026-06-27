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

/**
 * Class BusinessHourSchedule
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $name
 * @property string $timezone
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Workspace $workspace
 * @property Collection|Workspace[] $slaPoliciesWorkspaces
 * @property Collection|BusinessHourInterval[] $businessHourIntervals
 * @property Collection|SlaPolicy[] $slaPolicies
 */
#[Table(
    name: 'business_hour_schedules',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'name', 'timezone'])]
class BusinessHourSchedule extends TenantAwareEntity
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
            'timezone' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<BusinessHourInterval, $this>
     */
    public function businessHourIntervals(): HasMany
    {
        return $this->hasMany(BusinessHourInterval::class, 'schedule_id', 'id');
    }

    /**
     * @return HasMany<SlaPolicy, $this>
     */
    public function slaPolicies(): HasMany
    {
        return $this->hasMany(SlaPolicy::class, 'schedule_id', 'id');
    }

    /**
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    /**
     * @return BelongsToMany<Workspace, $this>
     */
    public function slaPoliciesWorkspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'sla_policies', 'id', 'id')
            ->withPivot('workspace_id', 'name', 'first_reply_minutes', 'next_reply_minutes', 'resolution_minutes', 'schedule_id')
            ->withTimestamps();
    }
}
