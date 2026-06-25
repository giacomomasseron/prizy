<?php

declare(strict_types=1);

namespace App\Multitenancy\Tasks;

use Illuminate\Support\Facades\DB;
use Spatie\Multitenancy\Contracts\IsTenant;
use Spatie\Multitenancy\Tasks\SwitchTenantTask;
use App\Scopes\WorkspaceScope;

final class UnsetWorkspaceScopeTask implements SwitchTenantTask
{
    public function makeCurrent(IsTenant $tenant): void {}

    public function forgetCurrent(): void
    {
        WorkspaceScope::clearCurrentWorkspaceId();
        DB::statement("SELECT set_config('app.current_workspace_id', '', false)");
    }
}
