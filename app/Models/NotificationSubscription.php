<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Class NotificationSubscription
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $user_id
 * @property string $scope_type
 * @property string $scope_id
 * @property string $level
 * @property User $user
 * @property Workspace $workspace
 */
#[Table(
    name: 'notification_subscriptions',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'workspace_id', 'user_id', 'scope_type', 'scope_id', 'level'])]
class NotificationSubscription extends TenantAwareEntity
{
    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'workspace_id' => 'string',
            'user_id' => 'string',
            'scope_type' => 'string',
            'scope_id' => 'string',
            'level' => 'string',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }
}
