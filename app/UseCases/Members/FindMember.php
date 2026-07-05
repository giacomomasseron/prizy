<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Resolves a workspace-scoped User by ID.
 * The WorkspaceScope global scope ensures only users in the current
 * workspace are returned; a cross-workspace ID yields a 404.
 */
final class FindMember
{
    public function handle(string $id): User
    {
        $user = User::find($id);

        if ($user === null) {
            throw (new ModelNotFoundException())->setModel(User::class, [$id]);
        }

        return $user;
    }
}
