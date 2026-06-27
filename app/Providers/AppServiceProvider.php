<?php

namespace App\Providers;

use App\Auth\TokenGuard;
use App\Models\Issue;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Workspace;
use App\Policies\IssuePolicy;
use App\Policies\MemberPolicy;
use App\Policies\TicketPolicy;
use App\Policies\WorkspacePolicy;
use App\Repositories\PersonalAccessTokenRepository;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
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
        // Owner short-circuit: owners bypass every policy check.
        Gate::before(fn (User $user) => $user->admin_level === 'owner' ? true : null);

        Gate::policy(Issue::class,     IssuePolicy::class);
        Gate::policy(Ticket::class,    TicketPolicy::class);
        Gate::policy(Workspace::class, WorkspacePolicy::class);
        Gate::policy(User::class,      MemberPolicy::class);

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
