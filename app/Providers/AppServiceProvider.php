<?php

declare(strict_types=1);

namespace App\Providers;

use App\Auth\TokenGuard;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Auth\Authenticatable;
use App\Models\Cycle;
use App\Models\Issue;
use App\Models\Label;
use App\Models\Milestone;
use App\Models\Project;
use App\Models\Team;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Workspace;
use App\Policies\CyclePolicy;
use App\Policies\IssuePolicy;
use App\Policies\LabelPolicy;
use App\Policies\MemberPolicy;
use App\Policies\MilestonePolicy;
use App\Policies\ProjectPolicy;
use App\Policies\TeamPolicy;
use App\Policies\TicketPolicy;
use App\Policies\WorkspacePolicy;
use App\Repositories\PersonalAccessTokenRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Owner short-circuit: owners bypass every policy check WITHIN their own
        // workspace. Cross-tenant access is explicitly denied so that an owner
        // session replayed against another workspace host cannot elevate privilege.
        Gate::before(function (User $user, string $ability, array $arguments = []) {
            if ($user->admin_level !== 'owner') {
                return null; // not owner: let the policies decide
            }
            $model = $arguments[0] ?? null;
            // An owner can do anything WITHIN their own workspace, but not across tenants.
            if ($model instanceof \Illuminate\Database\Eloquent\Model
                && isset($model->workspace_id)
                && (string) $model->workspace_id !== (string) $user->workspace_id) {
                return false;
            }

            return true;
        });

        Gate::policy(Cycle::class,     CyclePolicy::class);
        Gate::policy(Milestone::class, MilestonePolicy::class);
        Gate::policy(Issue::class,     IssuePolicy::class);
        Gate::policy(Label::class,     LabelPolicy::class);
        Gate::policy(Project::class,   ProjectPolicy::class);
        Gate::policy(Team::class,      TeamPolicy::class);
        Gate::policy(Ticket::class,    TicketPolicy::class);
        Gate::policy(Workspace::class, WorkspacePolicy::class);
        Gate::policy(User::class,      MemberPolicy::class);

        // Allow API docs access in every non-production environment so that the
        // testing environment (and local) can hit /docs/api* without a logged-in
        // user.  RestrictedDocsAccess already short-circuits for 'local'; this
        // Gate covers 'testing' and any other non-prod env.  Production keeps its
        // existing default-deny behaviour (Gate::allows('viewApiDocs') → false).
        // The nullable ?Authenticatable is required so Laravel's Gate treats this
        // as guest-accessible (callbackAllowsGuests checks parameters[0]->allowsNull()).
        Gate::define('viewApiDocs', static fn (?Authenticatable $user): bool => ! app()->isProduction());

        // Per-user rate limiting for the authenticated /v1 API group. Reads and
        // writes get independent buckets so a read burst (e.g. loading a board)
        // never starves the write allowance. Keyed per user (Bearer or session),
        // falling back to IP. Limits are intentionally generous for reads.
        RateLimiter::for('v1', function (Request $request) {
            $key = (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());

            return $request->isMethodSafe()
                ? Limit::perMinute(300)->by("v1-read:{$key}")
                : Limit::perMinute(60)->by("v1-write:{$key}");
        });

        // Register the custom Bearer-token guard driver.
        // config/auth.php declares 'token' => ['driver' => 'token-bearer'].
        // NeedsTenant runs before this guard, so the workspace is already resolved.
        Auth::extend('token-bearer', function ($app, string $name, array $config): TokenGuard {
            return new TokenGuard(
                $app->make(PersonalAccessTokenRepository::class),
                $app->make('request'),
            );
        });
    }
}
