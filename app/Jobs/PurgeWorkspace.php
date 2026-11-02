<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Workspace;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\DB;
use Spatie\Multitenancy\Jobs\NotTenantAware;

/**
 * Erases a workspace DeleteWorkspace has closed (soft-deleted), with everything
 * in it, for good. On the queue because a large workspace takes longer than a
 * request may.
 *
 * One DELETE: every table cascades from workspaces, directly or through a
 * parent. The foreign keys with no ON DELETE rule are deferred for it, because
 * the cascade can reach a user before the rows that name them (see the
 * 2026_10_17 migration), then checked before the transaction ends, when
 * nothing is left to name anyone.
 *
 * Not tenant-aware: the tenant it would make current is the one it deletes,
 * and a closed workspace is no longer found as one. With no workspace current,
 * RLS lets it reach every row.
 *
 * Only a closed workspace is erased, so a stray dispatch cannot delete a live
 * one, and a second run (a retry, or workspaces:purge-deleted catching up)
 * deletes nothing. That also makes the queue's retry_after harmless: a worker
 * that picks the job up again while the first still runs waits on the row
 * lock, then finds nothing left.
 *
 * On its own queue, with its own worker (purge-worker in
 * docker-compose.prod.yml): an erase that takes minutes would otherwise hold
 * up every broadcast and Slack post of every workspace behind it. Unique per
 * workspace, so the hourly re-queue never stacks a second copy behind one
 * still waiting or running; a workspace that can never be erased then shows up
 * as at most one failed job an hour, until someone looks.
 */
final class PurgeWorkspace implements NotTenantAware, ShouldBeUnique, ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;

    public int $tries = 3;

    /** The worker's own default, 60 seconds, is what a large workspace outgrows. */
    public int $timeout = 3600;

    /** Outlives every attempt (3 × the timeout, plus the backoff), in case a lock is never released. */
    public int $uniqueFor = 4 * 3600;

    public function __construct(
        public readonly string $workspaceId,
    ) {
        $this->onQueue('purge');
    }

    public function uniqueId(): string
    {
        return $this->workspaceId;
    }

    /** @return list<int> */
    public function backoff(): array
    {
        return [60, 300];
    }

    public function handle(): void
    {
        DB::transaction(function (): void {
            DB::statement('SET CONSTRAINTS ALL DEFERRED');
            Workspace::onlyTrashed()->whereKey($this->workspaceId)->forceDelete();
            DB::statement('SET CONSTRAINTS ALL IMMEDIATE');
        });
    }
}
