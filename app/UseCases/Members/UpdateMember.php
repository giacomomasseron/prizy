<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\User;

final class UpdateMember
{
    /**
     * Update a workspace member's admin_level and/or capability flags.
     *
     * Business guards (each with a specific 403 message):
     *   1. Admin cannot touch an owner.
     *   2. Only an owner may promote someone to owner.
     *   3. No one may change their own admin_level.
     *   4. (belt-and-suspenders, unreachable) Cannot demote the last owner.
     *
     * @param  array<string, mixed>  $data  Validated subset of: admin_level, is_developer, is_agent
     */
    public function handle(User $actor, User $target, array $data): User
    {
        // Guard 1: admin cannot touch an owner
        if ($actor->admin_level === 'admin' && $target->admin_level === 'owner') {
            abort(403, 'Admins cannot modify owners.');
        }

        // Guard 2: only owner may set level to owner
        if (($data['admin_level'] ?? null) === 'owner' && $actor->admin_level !== 'owner') {
            abort(403, 'Only owners may assign the owner level.');
        }

        // Guard 3: cannot demote self
        if ($actor->id === $target->id && isset($data['admin_level']) && $data['admin_level'] !== $actor->admin_level) {
            abort(403, 'You cannot change your own administrative level.');
        }

        // Guard 4: cannot demote last owner
        // belt-and-suspenders: unreachable because self-demote + admin-cannot-modify-owner already prevent reducing owners to zero
        if ($target->admin_level === 'owner' && ($data['admin_level'] ?? 'owner') !== 'owner') {
            $ownerCount = User::where('workspace_id', $actor->workspace_id)
                ->where('admin_level', 'owner')
                ->withoutTrashed()
                ->count();
            if ($ownerCount <= 1) {
                abort(403, 'Cannot demote the last owner.');
            }
        }

        $allowed = ['admin_level', 'is_developer', 'is_agent'];
        $target->fill(array_filter($data, fn (string $k): bool => in_array($k, $allowed, true), ARRAY_FILTER_USE_KEY));
        $target->save();

        return $target->fresh();
    }
}
