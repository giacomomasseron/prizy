<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class Automation
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $created_by
 * @property string $name
 * @property string $trigger_event
 * @property bool $is_active
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property User $user
 * @property Workspace $workspace
 * @property Collection|AutomationAction[] $automationActions
 * @property Collection|AutomationCondition[] $automationConditions
 */
#[Table(
    name: 'automations',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'workspace_id', 'created_by', 'name', 'trigger_event', 'is_active'])]
class Automation extends TenantAwareEntity
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'workspace_id' => 'string',
            'created_by' => 'string',
            'name' => 'string',
            'trigger_event' => 'string',
            'is_active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<AutomationAction, $this>
     */
    public function automationActions(): HasMany
    {
        return $this->hasMany(AutomationAction::class, 'automation_id', 'id');
    }

    /**
     * @return HasMany<AutomationCondition, $this>
     */
    public function automationConditions(): HasMany
    {
        return $this->hasMany(AutomationCondition::class, 'automation_id', 'id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }
}
