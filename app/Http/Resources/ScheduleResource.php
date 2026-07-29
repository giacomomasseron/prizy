<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ScheduleResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'timezone' => $this->timezone,
            'intervals' => $this->businessHourIntervals
                ->sortBy(['day_of_week', 'opens_at'])
                ->map(fn ($iv) => [
                    'day_of_week' => (int) $iv->day_of_week,
                    'opens_at' => substr((string) $iv->opens_at, 0, 5),
                    'closes_at' => substr((string) $iv->closes_at, 0, 5),
                ])->values(),
        ];
    }
}
