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
        $s = self::statusFor($ticket->created_at, $ticket->first_replied_at, (int) $policy->first_reply_minutes, $policy->schedule, self::hasBreachRow($ticket, 'first_reply'));

        return ['policy_name' => $policy->name, 'target_minutes' => $s['target_minutes'], 'due_at' => $s['due_at'], 'state' => $s['state']];
    }

    /**
     * All applicable SLA metric statuses for a ticket (first_reply + resolution always;
     * next_reply only when the policy sets it, the first reply already happened, and the
     * latest public message is a pending customer reply).
     *
     * @return list<array{metric:string,policy_name:?string,target_minutes:int,due_at:CarbonInterface,state:string,remaining_minutes:int,within_business_hours:bool}>
     */
    public static function metrics(Ticket $ticket): array
    {
        $policy = $ticket->slaPolicy;
        if ($policy === null) {
            return [];
        }

        $out = [];
        $out[] = ['metric' => 'first_reply', 'policy_name' => $policy->name]
            + self::statusFor($ticket->created_at, $ticket->first_replied_at, (int) $policy->first_reply_minutes, $policy->schedule, self::hasBreachRow($ticket, 'first_reply'));
        $out[] = ['metric' => 'resolution', 'policy_name' => $policy->name]
            + self::statusFor($ticket->created_at, $ticket->resolved_at, (int) $policy->resolution_minutes, $policy->schedule, self::hasBreachRow($ticket, 'resolution'));

        $latest = $ticket->latestPublicMessage;
        if ($policy->next_reply_minutes !== null && $ticket->first_replied_at !== null && $latest !== null && $latest->sender_type === 'contact') {
            $out[] = ['metric' => 'next_reply', 'policy_name' => $policy->name]
                + self::statusFor($latest->created_at, null, (int) $policy->next_reply_minutes, $policy->schedule, self::hasBreachRow($ticket, 'next_reply'));
        }

        return $out;
    }

    /**
     * @return array{target_minutes:int,due_at:CarbonInterface,state:string,remaining_minutes:int,within_business_hours:bool}
     */
    private static function statusFor(CarbonInterface $clockStart, ?CarbonInterface $doneAt, int $targetMinutes, ?BusinessHourSchedule $schedule, bool $hasBreachRow): array
    {
        $due = self::dueAt($clockStart, $targetMinutes, $schedule);
        $now = now();
        if ($doneAt !== null) {
            $state = $doneAt->lessThanOrEqualTo($due) ? 'met' : 'breached';
        } elseif ($hasBreachRow || $now->greaterThan($due)) {
            $state = 'breached';
        } else {
            $state = 'due';
        }

        return [
            'target_minutes' => $targetMinutes,
            'due_at' => $due,
            'state' => $state,
            'remaining_minutes' => $state === 'due' ? self::businessMinutesBetween($now, $due, $schedule) : 0,
            'within_business_hours' => self::withinBusinessHours($now, $schedule),
        ];
    }

    private static function hasBreachRow(Ticket $ticket, string $metric): bool
    {
        return $ticket->slaBreaches->firstWhere('metric', $metric) !== null;
    }

    /** Business minutes in [from, to) walking the schedule; 0 when to<=from; 24/7 fallback = wall-clock. */
    public static function businessMinutesBetween(CarbonInterface $from, CarbonInterface $to, ?BusinessHourSchedule $schedule): int
    {
        if ($to->lessThanOrEqualTo($from)) {
            return 0;
        }
        if ($schedule === null) {
            return (int) round($from->diffInMinutes($to));
        }
        $tz = $schedule->timezone ?: 'UTC';
        $cursor = $from->copy()->setTimezone($tz);
        $end = $to->copy()->setTimezone($tz);
        $intervals = $schedule->businessHourIntervals;
        $total = 0;
        for ($day = 0; $day < 366; $day++) {
            $date = $cursor->copy()->addDays($day)->startOfDay();
            if ($date->greaterThan($end)) {
                break;
            }
            foreach ($intervals->where('day_of_week', (int) $date->dayOfWeek)->sortBy('opens_at') as $iv) {
                $open = $date->copy()->setTimeFromTimeString($iv->opens_at);
                $close = $date->copy()->setTimeFromTimeString($iv->closes_at);
                $winStart = ($day === 0 && $cursor->greaterThan($open)) ? $cursor->copy() : $open;
                $winEnd = $end->lessThan($close) ? $end->copy() : $close;
                if ($winStart->lessThan($winEnd)) {
                    $total += (int) $winStart->diffInMinutes($winEnd);
                }
            }
        }

        return $total;
    }

    /** True when $now falls inside a business-hour interval (always true for a null 24/7 schedule). */
    public static function withinBusinessHours(CarbonInterface $now, ?BusinessHourSchedule $schedule): bool
    {
        if ($schedule === null) {
            return true;
        }
        $tz = $schedule->timezone ?: 'UTC';
        $local = $now->copy()->setTimezone($tz);
        foreach ($schedule->businessHourIntervals->where('day_of_week', (int) $local->dayOfWeek) as $iv) {
            $open = $local->copy()->setTimeFromTimeString($iv->opens_at);
            $close = $local->copy()->setTimeFromTimeString($iv->closes_at);
            if ($local->greaterThanOrEqualTo($open) && $local->lessThan($close)) {
                return true;
            }
        }

        return false;
    }
}
