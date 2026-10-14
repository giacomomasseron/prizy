<?php

declare(strict_types=1);

namespace App\Services;

/** The time on a day plan (the Today v2 design): a plan item's personal estimate, in minutes. */
final class PlanTime
{
    public const MIN = 15;

    public const MAX = 720;

    /** The time an issue starts with on the plan: 1 hour per story point (none or 0 → 1 hour), within 15m–12h. */
    public static function defaultMinutes(?int $points): int
    {
        return max(self::MIN, min(self::MAX, ($points ?? 0) > 0 ? (int) $points * 60 : 60));
    }

    /** 45m, 2h, 1h 30m. */
    public static function format(int $minutes): string
    {
        $hours = intdiv(max(0, $minutes), 60);
        $rest = max(0, $minutes) % 60;
        if ($hours === 0) {
            return "{$rest}m";
        }

        return $rest === 0 ? "{$hours}h" : "{$hours}h {$rest}m";
    }
}
