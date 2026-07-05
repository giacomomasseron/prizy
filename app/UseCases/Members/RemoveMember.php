<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\Issue;
use App\Models\Project;
use App\Models\User;

final class RemoveMember
{
    /**
     * Remove a member from the workspace.
     *
     * Business guards (each with a specific 403 message):
     *   1. Cannot remove yourself.
     *   2. Admin cannot remove an owner.
     *   3. (belt-and-suspenders) Cannot remove the last owner.
     *
     * Soft-delete won't cascade FK constraints, so references are nulled explicitly
     * before the target is soft-deleted.
     */
    public function handle(User $actor, User $target): void
    {
        // Guard 1: cannot remove self
        if ($actor->id === $target->id) {
            abort(403, 'Cannot remove yourself.');
        }

        // Guard 2: admin cannot remove an owner
        if ($actor->admin_level === 'admin' && $target->admin_level === 'owner') {
            abort(403, 'Admins cannot remove owners.');
        }

        // belt-and-suspenders: unreachable because self-remove + admin-cannot-modify-owner already prevent reducing owners to zero
        if ($target->admin_level === 'owner') {
            $ownerCount = User::where('workspace_id', $actor->workspace_id)
                ->where('admin_level', 'owner')->withoutTrashed()->count();
            if ($ownerCount <= 1) {
                abort(403, 'Cannot remove the last owner.');
            }
        }

        // Null references (soft-delete won't cascade)
        Issue::where('workspace_id', $actor->workspace_id)
            ->where('assignee_id', $target->id)
            ->update(['assignee_id' => null]);

        Project::where('workspace_id', $actor->workspace_id)
            ->where('lead_id', $target->id)
            ->update(['lead_id' => null]);

        \DB::table('team_members')->where('user_id', $target->id)->delete();
        \DB::table('project_members')->where('user_id', $target->id)->delete();

        // Note: agent_group_members follows the same pattern; deferred to Phase 3.
        $target->delete(); // soft-delete
    }
}
