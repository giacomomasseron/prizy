<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A personal access token for programmatic API access.
 *
 * Intentionally NOT a TenantAwareEntity — the table has no workspace_id.
 * Workspace enforcement is performed at query time in the TokenGuard via the
 * workspace-scoped User query (User::find uses WorkspaceScope).
 *
 * @property string      $id
 * @property string      $user_id
 * @property string      $name
 * @property string      $token_hash  SHA-256 hex of the plaintext token (never exposed)
 * @property Carbon|null $last_used_at
 * @property Carbon|null $expires_at
 * @property Carbon      $created_at
 * @property Carbon      $updated_at
 * @property User        $user
 */
class PersonalAccessToken extends Model
{
    use HasFactory;

    protected $table = 'personal_access_tokens';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'name',
        'token_hash',
        'expires_at',
        'last_used_at',
    ];

    /**
     * Never serialise the hash — it must not appear in API responses.
     *
     * @var list<string>
     */
    protected $hidden = ['token_hash'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id'           => 'string',
            'user_id'      => 'string',
            'name'         => 'string',
            'token_hash'   => 'string',
            'last_used_at' => 'datetime',
            'expires_at'   => 'datetime',
            'created_at'   => 'datetime',
            'updated_at'   => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
