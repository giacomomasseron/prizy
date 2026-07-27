<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\BusinessHourSchedule;
use App\Models\Ticket;
use Carbon\CarbonInterface;

final class SlaCalculator
{
    /**
     * Absolute due instant obtained by adding $minutes of BUSINESS time to $start,
     * walking the schedule's intervals in its timezone. 24/7 fallback when no schedule.
     */
    public static function dueAt(CarbonInterface $start, int $minutes, ?BusinessHourSchedule $schedule): CarbonInterface
    {
        if ($schedule === null) {
            return $start->copy()->addMinutes($minutes);
        }

        $tz = $schedule->timezone ?: 'UTC';
        $cursor = $start->copy()->setTimezone($tz);
        $remaining = $minutes;
        $intervals = $schedule->businessHourIntervals;

        for ($day = 0; $day < 366 && $remaining > 0; $day++) {
            $date = $cursor->copy()->addDays($day)->startOfDay();
            $dow = (int) $date->dayOfWeek; // Carbon: 0=Sun..6=Sat === business_hour_intervals.day_of_week
            $todays = $intervals->where('day_of_week', $dow)->sortBy('opens_at');

            foreach ($todays as $iv) {
                $open = $date->copy()->setTimeFromTimeString($iv->opens_at);
                $close = $date->copy()->setTimeFromTimeString($iv->closes_at);
                $windowStart = ($day === 0 && $cursor->greaterThan($open)) ? $cursor->copy() : $open;
                if ($windowStart->greaterThanOrEqualTo($close)) {
                    continue; // start is already past this interval
                }
                $available = (int) $windowStart->diffInMinutes($close); // positive: close is later
                if ($remaining <= $available) {
                    return $windowStart->addMinutes($remaining)->setTimezone('UTC');
                }
                $remaining -= $available;
            }
        }

        // Empty/degenerate schedule — never leave the SLA uncomputed.
        return $start->copy()->addMinutes($minutes);
    }

    /**
     * @return array{policy_name: ?string, target_minutes: ?int, due_at: ?CarbonInterface, state: string}
     */
    public static function firstReplyStatus(Ticket $ticket): array
    {
        $policy = $ticket->slaPolicy;
        if ($policy === null) {
            return ['policy_name' => null, 'target_minutes' => null, 'due_at' => null, 'state' => 'none'];
        }

        $due = self::dueAt($ticket->created_at, (int) $policy->first_reply_minutes, $policy->schedule);
        $repliedAt = $ticket->first_replied_at;
        $hasBreachRow = $ticket->slaBreaches->firstWhere('metric', 'first_reply') !== null;

        if ($repliedAt !== null) {
            $state = $repliedAt->lessThanOrEqualTo($due) ? 'met' : 'breached';
        } elseif ($hasBreachRow || now()->greaterThan($due)) {
            $state = 'breached';
        } else {
            $state = 'due';
        }

        return [
            'policy_name' => $policy->name,
            'target_minutes' => (int) $policy->first_reply_minutes,
            'due_at' => $due,
            'state' => $state,
        ];
    }
}
