<?php

declare(strict_types=1);

namespace App\UseCases\Workspace;

use App\Models\Workspace;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * Deletes every workspace still pending after the activation window, owner
 * included (users.workspace_id cascades), so the address is free again. Only
 * a sign-up made with SIGNUP_REQUIRES_ACTIVATION on is ever pending, and its
 * owner could never log in, so it holds nothing but that one user.
 *
 * @method int run()
 */
final class PrunePendingWorkspaces extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(): int
    {
        // One DELETE, not each() + forceDelete(): each() pages by OFFSET, and
        // deleting rows under it skips every other page.
        return (int) Workspace::withTrashed()
            ->whereNull('activated_at')
            ->where('created_at', '<', now()->subHours(Workspace::ACTIVATION_WINDOW_HOURS))
            ->forceDelete();
    }
}
