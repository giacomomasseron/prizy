<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\Workspace;

/**
 * Whether a well-formed slug is still free, for the sign-up page's live check.
 * Counted the way sign-up's unique rule counts: a workspace awaiting
 * activation, or deleted and not yet erased, still holds its slug.
 */
final class CheckWorkspaceSlug
{
    public function isTaken(string $slug): bool
    {
        return Workspace::withTrashed()->where('slug', $slug)->exists();
    }
}
