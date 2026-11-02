<?php

declare(strict_types=1);

namespace App\UseCases\Workspace;

use App\Models\User;
use App\Services\HelpdeskAccess;
use App\Services\TrackerAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * The workspace-level module switches, for the actor's own workspace.
 *
 * Rides along on /v1/me because the SPA needs them at the same moment it needs
 * the capability flags: both decide what the navigation offers.
 *
 * @method static array run(User $actor)
 */
final class ShowWorkspaceModules extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return array{helpdesk_enabled: bool, tracker_enabled: bool} */
    private function execute(User $actor): array
    {
        return [
            'helpdesk_enabled' => HelpdeskAccess::enabledFor($actor->workspace_id),
            'tracker_enabled'  => TrackerAccess::enabledFor($actor->workspace_id),
        ];
    }
}
