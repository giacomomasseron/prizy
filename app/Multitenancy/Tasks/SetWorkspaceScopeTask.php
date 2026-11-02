<?php

declare(strict_types=1);

namespace App\Multitenancy\Tasks;

use Illuminate\Support\Facades\DB;
use Spatie\Multitenancy\Contracts\IsTenant;
use Spatie\Multitenancy\Tasks\SwitchTenantTask;
use App\Scopes\WorkspaceScope;

final class SetWorkspaceScopeTask implements SwitchTenantTask
{
    public function makeCurrent(IsTenant $tenant): void
    {
        WorkspaceScope::setCurrentWorkspaceId($tenant->getKey());

        // Expose the tenant to PostgreSQL RLS (schema.sql SECTION 7):
        // policies read current_setting('app.current_workspace_id').
        DB::statement(
            "SELECT set_config('app.current_workspace_id', ?, false)",
            [$tenant->getKey()]
        );
    }

    public function forgetCurrent(): void
    {
        WorkspaceScope::clearCurrentWorkspaceId();

        // Clear the GUC so landlord / cross-tenant work runs unscoped
        // (RLS is permissive when the setting is empty).
        DB::statement("SELECT set_config('app.current_workspace_id', '', false)");
    }
}
