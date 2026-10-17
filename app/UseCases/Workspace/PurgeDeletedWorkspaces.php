<?php

declare(strict_types=1);

namespace App\UseCases\Workspace;

use App\Jobs\PurgeWorkspace;
use App\Models\Workspace;

/**
 * Queues PurgeWorkspace again for every workspace closed more than an hour ago
 * and still there: DeleteWorkspace could not queue its job, the queue lost it,
 * or it failed every attempt. A workspace closed more recently is left to the
 * job queued with it.
 */
final class PurgeDeletedWorkspaces
{
    public const GRACE_MINUTES = 60;

    public function handle(): int
    {
        $ids = Workspace::onlyTrashed()
            ->where('deleted_at', '<', now()->subMinutes(self::GRACE_MINUTES))
            ->pluck('id');

        foreach ($ids as $id) {
            PurgeWorkspace::dispatch($id);
        }

        return $ids->count();
    }
}
