<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\BusinessHourSchedule;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ScheduleRepository
{
    /** @return Collection<int, BusinessHourSchedule> */
    public function forWorkspace(): Collection
    {
        return BusinessHourSchedule::query()->with('businessHourIntervals')->orderBy('name')->orderBy('id')->get();
    }

    public function find(string $id): ?BusinessHourSchedule
    {
        return BusinessHourSchedule::query()->with('businessHourIntervals')->find($id);
    }

    /**
     * @param  array<string,mixed>  $attrs
     * @param  list<array{day_of_week:int,opens_at:string,closes_at:string}>  $intervals
     */
    public function create(array $attrs, array $intervals): BusinessHourSchedule
    {
        return DB::transaction(function () use ($attrs, $intervals): BusinessHourSchedule {
            $attrs['id'] ??= (string) Str::uuid();
            $schedule = BusinessHourSchedule::create($attrs);
            $this->syncIntervals($schedule, $intervals);

            return $schedule->fresh('businessHourIntervals');
        });
    }

    /**
     * @param  array<string,mixed>  $attrs
     * @param  list<array{day_of_week:int,opens_at:string,closes_at:string}>  $intervals
     */
    public function update(BusinessHourSchedule $schedule, array $attrs, array $intervals): BusinessHourSchedule
    {
        return DB::transaction(function () use ($schedule, $attrs, $intervals): BusinessHourSchedule {
            $schedule->update($attrs);
            $schedule->businessHourIntervals()->delete();
            $this->syncIntervals($schedule, $intervals);

            return $schedule->fresh('businessHourIntervals');
        });
    }

    public function delete(BusinessHourSchedule $schedule): void
    {
        $schedule->delete();
    }

    /** @param list<array{day_of_week:int,opens_at:string,closes_at:string}> $intervals */
    private function syncIntervals(BusinessHourSchedule $schedule, array $intervals): void
    {
        foreach ($intervals as $iv) {
            $schedule->businessHourIntervals()->create([
                'id' => (string) Str::uuid(),
                'day_of_week' => $iv['day_of_week'],
                'opens_at' => $iv['opens_at'],
                'closes_at' => $iv['closes_at'],
            ]);
        }
    }
}
