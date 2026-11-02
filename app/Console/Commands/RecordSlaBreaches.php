<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Repositories\SlaBreachRepository;
use Illuminate\Console\Command;

final class RecordSlaBreaches extends Command
{
    protected $signature = 'sla:record-breaches';

    protected $description = 'Record sla_breaches rows for tickets that have breached a first-reply / next-reply / resolution SLA.';

    public function handle(SlaBreachRepository $repository): int
    {
        $count = $repository->recordDueBreaches();
        $this->info("Recorded {$count} SLA breach(es).");

        return self::SUCCESS;
    }
}
