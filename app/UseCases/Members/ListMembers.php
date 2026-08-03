<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

final class ListMembers
{
    /** @return Collection<int, User> */
    public function handle(User $actor): Collection
    {
        return User::where('workspace_id', $actor->workspace_id)
            ->select(['id', 'name', 'is_agent'])
            ->orderBy('name')
            ->withoutTrashed()
            ->get();
    }
}
