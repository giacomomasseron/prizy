<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
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
 * @property string|null $color         — workspace mark colour (#rrggbb), picked at sign-up
 * @property string      $plan
 * @property bool        $helpdesk_enabled — workspace-level switch for the support module
 * @property string      $timezone
 * @property string      $locale
 * @property \Illuminate\Support\Carbon|null $activated_at — null while a sign-up awaits its owner's email confirmation
 */
final class Workspace extends Tenant
{
    use HasFactory;
    use SoftDeletes;

    /**
     * How long a pending sign-up waits for its owner: the emailed link lasts
     * this long, and workspaces:prune-pending deletes the workspace after it.
     */
    public const ACTIVATION_WINDOW_HOURS = 24;

    protected $table = 'workspaces';
    protected $primaryKey = 'id';
    public    $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name',
        'slug',
        'custom_domain',
        'logo_url',
        'color',
        'plan',
        'helpdesk_enabled',
        'timezone',
        'locale',
    ];

    protected $casts = [
        'helpdesk_enabled' => 'boolean',
        'activated_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Workspaces a hostname may reach. WorkspaceTenantFinder and
     * AuthorizeTlsHost both filter on this, so they keep agreeing.
     *
     * @param  Builder<Workspace>  $query
     */
    public function scopeActivated(Builder $query): void
    {
        $query->whereNotNull('activated_at');
    }

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
