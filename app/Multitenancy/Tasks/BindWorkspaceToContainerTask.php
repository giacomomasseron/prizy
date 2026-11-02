<?php

declare(strict_types=1);

namespace App\Multitenancy\Tasks;

use Spatie\Multitenancy\Contracts\IsTenant;
use Spatie\Multitenancy\Tasks\SwitchTenantTask;
use App\Models\Workspace;

final class BindWorkspaceToContainerTask implements SwitchTenantTask
{
    public function makeCurrent(IsTenant $tenant): void
    {
        app()->instance(Workspace::class, $tenant);
    }

    public function forgetCurrent(): void
    {
        app()->forgetInstance(Workspace::class);
    }
}
