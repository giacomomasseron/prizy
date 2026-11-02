<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\Workspace;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * Whether a well-formed slug is still free, for the sign-up page's live check.
 * Counted the way sign-up's unique rule counts: a workspace awaiting
 * activation, or deleted and not yet erased, still holds its slug.
 *
 * @method static bool run(string $slug)
 */
final class CheckWorkspaceSlug extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(string $slug): bool
    {
        return Workspace::withTrashed()->where('slug', $slug)->exists();
    }
}
