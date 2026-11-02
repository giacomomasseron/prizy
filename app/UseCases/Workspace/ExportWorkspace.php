<?php

declare(strict_types=1);

namespace App\UseCases\Workspace;

use App\Models\User;
use App\Models\Workspace;
use App\Services\WorkspaceExportBuilder;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * Owner-only whole-workspace export. Capability-in-use-case by design: the
 * owner check is the one gate Gate::before cannot decide (it IS that check),
 * and no policy exists for it — mirroring the helpdesk-config gating pattern.
 *
 * @method static array run(User $actor)
 */
final class ExportWorkspace extends BaseUseCase implements UseCaseInterface
{
    private readonly WorkspaceExportBuilder $builder;

    public function handle(mixed ...$arguments): mixed
    {
        $this->builder = app(WorkspaceExportBuilder::class);

        return $this->execute(...$arguments);
    }

    /** @return array{path: string, filename: string} */
    private function execute(User $actor): array
    {
        abort_unless($actor->admin_level === 'owner', 403);

        /** @var Workspace $workspace */
        $workspace = Workspace::query()->findOrFail($actor->workspace_id);

        return $this->builder->build($workspace);
    }
}
