<?php

declare(strict_types=1);

namespace App\UseCases\Cycles;

use App\Models\Cycle;
use App\Repositories\CycleRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @method static Cycle run(string $id)
 */
final class FindCycle extends BaseUseCase implements UseCaseInterface
{
    private readonly CycleRepository $cycles;

    public function handle(mixed ...$arguments): mixed
    {
        $this->cycles = app(CycleRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(string $id): Cycle
    {
        $cycle = $this->cycles->findViaWorkspace($id);
        if ($cycle === null) {
            throw (new ModelNotFoundException())->setModel(Cycle::class, [$id]);
        }

        return $cycle;
    }
}
