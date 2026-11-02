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

        // A workspace that has switched the support module off has nobody who can
        // answer a ticket, so it shouldn't accrue breaches while it is off.
        Workspace::query()->where('helpdesk_enabled', true)->get()->each(function (Workspace $workspace) use (&$written): void {
            $workspace->makeCurrent();
            try {
                Ticket::query()
                    ->whereNull('resolved_at')->whereNotNull('sla_policy_id')
                    ->with(['slaPolicy.schedule.businessHourIntervals', 'slaBreaches', 'latestPublicMessage'])
                    ->chunkById(200, function ($tickets) use (&$written): void {
                        foreach ($tickets as $ticket) {
                            $metrics = SlaCalculator::metrics($ticket);

                            // Persist the first-reply deadline (for the desk's SLA-due sort). Only write on change.
                            $firstReply = collect($metrics)->firstWhere('metric', 'first_reply');
                            if ($firstReply !== null) {
                                $due = $firstReply['due_at'];
                                if ($ticket->first_reply_due_at === null || ! $ticket->first_reply_due_at->equalTo($due)) {
                                    $ticket->update(['first_reply_due_at' => $due]);
                                }
                            }

                            foreach ($metrics as $m) {
                                if ($m['state'] !== 'breached') {
                                    continue;
                                }
                                if ($m['metric'] === 'next_reply') {
                                    continue; // recurring metric — not representable by UNIQUE(ticket_id, metric); computed live on read
                                }
                                if ($ticket->slaBreaches->firstWhere('metric', $m['metric']) !== null) {
                                    continue;
                                }
                                $breach = SlaBreach::firstOrCreate(
                                    ['ticket_id' => $ticket->id, 'metric' => $m['metric']],
                                    ['id' => (string) Str::uuid(), 'breached_at' => $m['due_at']],
                                );
                                if ($breach->wasRecentlyCreated) {
                                    $written++;
                                }
                            }
                        }
                    });
            } catch (\Throwable $e) {
                report($e); // don't let one workspace abort the run
            } finally {
                $workspace->forgetCurrent();
            }
        });

        return $written;
    }
}
