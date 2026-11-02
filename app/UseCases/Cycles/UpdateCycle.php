<?php

declare(strict_types=1);

namespace App\UseCases\Cycles;

use App\Models\Cycle;
use App\Models\User;
use App\Repositories\CycleRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * @method static Cycle run(User $actor, array $data)
 */
final class UpdateCycle extends BaseUseCase implements UseCaseInterface
{
    private readonly CycleRepository $cycles;

    public function handle(mixed ...$arguments): mixed
    {
        $this->cycles = app(CycleRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): Cycle
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
