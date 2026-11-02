<?php

declare(strict_types=1);

namespace App\UseCases\Cycles;

use App\Models\User;
use App\Repositories\CycleRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static void run(User $actor, array $data)
 */
final class DeleteCycle extends BaseUseCase implements UseCaseInterface
{
    private readonly CycleRepository $cycles;

    public function handle(mixed ...$arguments): mixed
    {
        $this->cycles = app(CycleRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): void
    {
        $cycle = $this->cycles->findViaWorkspace((string) $data['cycle_id']);
        if ($cycle === null) {
            throw ValidationException::withMessages(['cycle_id' => ['The selected cycle is invalid.']]);
        }
        $this->cycles->delete($cycle);
    }
}
