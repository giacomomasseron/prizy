<?php

declare(strict_types=1);

namespace Tests\Concerns;

use App\Models\Workspace;

trait InteractsWithTenant
{
    protected ?string $tenantHost = null;

    protected function actingInWorkspace(Workspace $workspace): static
    {
        $this->tenantHost = $workspace->slug . '.localhost';
        $workspace->makeCurrent();
        $this->withServerVariables(['HTTP_HOST' => $this->tenantHost]);

        return $this;
    }

    protected function tenantUrl(Workspace $workspace, string $path): string
    {
        return 'http://' . $workspace->slug . '.localhost/' . ltrim($path, '/');
    }
}
