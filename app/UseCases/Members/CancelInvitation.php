<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\Invitation;
use App\Models\User;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static void run(User $actor, string $invitationId)
 */
final class CancelInvitation extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    /**
     * Cancel a pending invitation by ID.
     *
     * The workspace-scoped findOrFail yields a 404 for any cross-workspace
     * or missing invitation ID, so no explicit workspace check is needed.
     */
    private function execute(User $actor, string $invitationId): void
    {
        Invitation::where('workspace_id', $actor->workspace_id)
            ->findOrFail($invitationId)
            ->delete();
    }
}
