<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class Invitation
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $email
 * @property string $admin_level
 * @property bool $is_developer
 * @property bool $is_agent
 * @property string $token_hash
 * @property string $invited_by
 * @property Carbon $expires_at
 * @property Carbon|null $accepted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property User $invitedBy
 * @property Workspace $workspace
 */
class Invitation extends TenantAwareEntity
{
    use HasFactory;

    protected $table = 'invitations';

    protected $fillable = [
        'email',
        'admin_level',
        'is_developer',
        'is_agent',
        'token_hash',
        'invited_by',
        'expires_at',
        'accepted_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id'           => 'string',
            'workspace_id' => 'string',
            'invited_by'   => 'string',
            'is_developer' => 'boolean',
            'is_agent'     => 'boolean',
            'expires_at'   => 'datetime',
            'accepted_at'  => 'datetime',
            'created_at'   => 'datetime',
            'updated_at'   => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }
}
