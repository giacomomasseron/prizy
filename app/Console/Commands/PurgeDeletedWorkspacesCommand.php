<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\UseCases\Workspace\PurgeDeletedWorkspaces;
use Illuminate\Console\Command;

final class PurgeDeletedWorkspacesCommand extends Command
{
    protected $signature = 'workspaces:purge-deleted';

    protected $description = 'Queue the erasing again for workspaces deleted over an hour ago that are still there.';

    public function handle(PurgeDeletedWorkspaces $purge): int
    {
        $count = $purge->handle();
        $this->info("Queued {$count} deleted workspace(s) for erasing.");

        return self::SUCCESS;
    }
}
