<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\UseCases\Workspace\PrunePendingWorkspaces;
use Illuminate\Console\Command;

final class PrunePendingWorkspacesCommand extends Command
{
    protected $signature = 'workspaces:prune-pending';

    protected $description = 'Delete workspaces whose owner never confirmed the sign-up within 24 hours.';

    public function handle(PrunePendingWorkspaces $prune): int
    {
        $count = $prune->handle();
        $this->info("Deleted {$count} pending workspace(s).");

        return self::SUCCESS;
    }
}
