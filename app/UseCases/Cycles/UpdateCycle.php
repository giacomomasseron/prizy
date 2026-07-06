<?php

declare(strict_types=1);

namespace App\UseCases\Cycles;

use App\Models\Cycle;
use App\Models\User;
use App\Repositories\CycleRepository;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

final class UpdateCycle
{
    public function __construct(private readonly CycleRepository $cycles) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Cycle
    {
        $cycle = $this->cycles->findViaWorkspace((string) $data['cycle_id']);
        if ($cycle === null) {
            throw ValidationException::withMessages(['cycle_id' => ['The selected cycle is invalid.']]);
        }

        $starts = Carbon::parse($data['starts_at'] ?? $cycle->starts_at);
        $ends   = Carbon::parse($data['ends_at']   ?? $cycle->ends_at);
        if ($ends->lessThanOrEqualTo($starts)) {
            throw ValidationException::withMessages(['ends_at' => ['The ends at must be after the starts at.']]);
        }

        return $this->cycles->update($cycle, array_intersect_key($data, array_flip(['name', 'starts_at', 'ends_at', 'cooldown_days', 'description'])));
    }
}
