<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\SlaBreach;
use App\Models\Ticket;
use App\Models\Workspace;
use App\Services\SlaCalculator;
use Illuminate\Support\Str;

final class SlaBreachRepository
{
    /**
     * Walk every workspace's OPEN policied tickets, compute each SLA metric, and record a
     * sla_breaches row for any metric that is breached and not already recorded. Iterates
     * per-workspace (makeCurrent) so WorkspaceScope + RLS apply — never scans cross-workspace.
     * Idempotent via the in-memory check + UNIQUE(ticket_id, metric).
     */
    public function recordDueBreaches(): int
    {
        $written = 0;

        Workspace::all()->each(function (Workspace $workspace) use (&$written): void {
            $workspace->makeCurrent();
            try {
                Ticket::query()
                    ->whereNull('resolved_at')->whereNotNull('sla_policy_id')
                    ->with(['slaPolicy.schedule.businessHourIntervals', 'slaBreaches', 'latestPublicMessage'])
                    ->chunkById(200, function ($tickets) use (&$written): void {
                        foreach ($tickets as $ticket) {
                            foreach (SlaCalculator::metrics($ticket) as $m) {
                                if ($m['state'] !== 'breached') {
                                    continue;
                                }
                                if ($ticket->slaBreaches->firstWhere('metric', $m['metric']) !== null) {
                                    continue;
                                }
                                SlaBreach::firstOrCreate(
                                    ['ticket_id' => $ticket->id, 'metric' => $m['metric']],
                                    ['id' => (string) Str::uuid(), 'breached_at' => $m['due_at']],
                                );
                                $written++;
                            }
                        }
                    });
            } finally {
                $workspace->forgetCurrent();
            }
        });

        return $written;
    }
}
