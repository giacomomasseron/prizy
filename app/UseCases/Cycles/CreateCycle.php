<?php

declare(strict_types=1);

namespace App\UseCases\Cycles;

use App\Models\Cycle;
use App\Models\Team;
use App\Models\User;
use App\Repositories\CycleRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method Cycle run(User $actor, array $data)
 */
final class CreateCycle extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly CycleRepository $cycles) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): Cycle
    {
        if (Team::find((string) $data['team_id']) === null) {
            throw ValidationException::withMessages(['team_id' => ['The selected team is invalid.']]);
        }

        return $this->cycles->create([
            'team_id'       => $data['team_id'],
            'name'          => $data['name'],
            'starts_at'     => $data['starts_at'],
            'ends_at'       => $data['ends_at'],
            'cooldown_days' => $data['cooldown_days'] ?? 0,
            'description'   => $data['description'] ?? null,
        ]);
    }
}
