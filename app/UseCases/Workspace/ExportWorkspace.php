<?php

declare(strict_types=1);

namespace App\UseCases\Workspace;

use App\Models\User;
use App\Models\Workspace;
use App\Services\WorkspaceExportBuilder;

/**
 * Owner-only whole-workspace export. Capability-in-use-case by design: the
 * owner check is the one gate Gate::before cannot decide (it IS that check),
 * and no policy exists for it — mirroring the helpdesk-config gating pattern.
 */
final class ExportWorkspace
{
    public function __construct(private readonly WorkspaceExportBuilder $builder) {}

    /** @return array{path: string, filename: string} */
    public function handle(User $actor): array
    {
        abort_unless($actor->admin_level === 'owner', 403);

        /** @var Workspace $workspace */
        $workspace = Workspace::query()->findOrFail($actor->workspace_id);

        return $this->builder->build($workspace);
    }
}
