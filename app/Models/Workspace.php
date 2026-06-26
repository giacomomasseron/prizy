<?php

declare(strict_types=1);

namespace App\Models;

use Spatie\Multitenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * The Workspace is the root aggregate for a tenant.
 * Extending Spatie's Tenant makes it the CurrentTenant target.
 *
 * @property string      $id
 * @property string      $name
 * @property string      $slug          — used as subdomain (e.g. acme → acme.app.com)
 * @property string|null $custom_domain — optional CNAME
 * @property string|null $logo_url      — workspace logo URL
 * @property string      $plan
 * @property string      $timezone
 * @property string      $locale
 */
final class Workspace extends Tenant
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'workspaces';
    protected $primaryKey = 'id';
    public    $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name',
        'slug',
        'custom_domain',
        'logo_url',
        'plan',
        'timezone',
        'locale',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -----------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------

    public function users(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(User::class, 'workspace_id');
    }

    public function teams(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Team::class, 'workspace_id');
    }
}
