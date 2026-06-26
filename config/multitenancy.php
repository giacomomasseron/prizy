<?php

declare(strict_types=1);

return [
    'tenant_model' => \App\Models\Workspace::class,
    'tenant_finder' => \App\Multitenancy\WorkspaceTenantFinder::class,
    // spatie/laravel-multitenancy v4 builds ONE task collection from
    // switch_tenant_tasks and uses it for both makeCurrent() and
    // forgetCurrent(); there is no separate forget_current_tenant_tasks key.
    // SetWorkspaceScopeTask::forgetCurrent() clears the scope + GUC on teardown.
    'switch_tenant_tasks' => [
        \App\Multitenancy\Tasks\SetWorkspaceScopeTask::class,
        \App\Multitenancy\Tasks\BindWorkspaceToContainerTask::class,
    ],
    'queues_are_tenant_aware_by_default' => true,
];
