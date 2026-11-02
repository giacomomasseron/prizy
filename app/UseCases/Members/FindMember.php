<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\User;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Resolves a workspace-scoped User by ID.
 * The WorkspaceScope global scope ensures only users in the current
 * workspace are returned; a cross-workspace ID yields a 404.
 *
 * @method User run(string $id)
 */
final class FindMember extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(string $id): User
    {
        $user = User::find($id);

        if ($user === null) {
            throw (new ModelNotFoundException())->setModel(User::class, [$id]);
        }

        return $user;
    }
}
