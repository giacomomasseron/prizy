<?php

declare(strict_types=1);

return [
    'tenant_model' => \App\Models\Workspace::class,
    'tenant_finder' => \App\Multitenancy\WorkspaceTenantFinder::class,
    'switch_tenant_tasks' => [
        \App\Multitenancy\Tasks\SetWorkspaceScopeTask::class,
        \App\Multitenancy\Tasks\BindWorkspaceToContainerTask::class,
    ],
    'forget_current_tenant_tasks' => [
        \App\Multitenancy\Tasks\UnsetWorkspaceScopeTask::class,
    ],
    'queues_are_tenant_aware_by_default' => true,
];
