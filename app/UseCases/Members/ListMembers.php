<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\User;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method static Collection run(User $actor)
 */
final class ListMembers extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return Collection<int, User> */
    private function execute(User $actor): Collection
    {
        return User::where('workspace_id', $actor->workspace_id)
            ->select(['id', 'name', 'is_agent'])
            ->orderBy('name')
            ->withoutTrashed()
            ->get();
    }
}
