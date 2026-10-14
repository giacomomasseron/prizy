<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

/** The day a Today read is for: `day_start`, the caller's local midnight with its offset (the Today v2 design). */
final class PlanDayRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // the route's tracker gate handles authorization
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // Local midnight: never in the future (10 minutes' grace for a browser clock that runs ahead), and never more than 36 hours back (any time zone's today).
            'day_start' => ['required', 'date', 'before_or_equal:'.now()->addMinutes(10)->toIso8601String(), 'after_or_equal:'.now()->subHours(36)->toIso8601String()],
        ];
    }

    /** The caller's local midnight, keeping its offset: its format('Y-m-d') is the caller's local date. */
    public function dayStart(): CarbonImmutable
    {
        return CarbonImmutable::parse((string) $this->validated('day_start'));
    }
}
