<?php

declare(strict_types=1);

namespace App\UseCases\Cycles;

use App\Models\Cycle;
use App\Repositories\CycleRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @method Cycle run(string $id)
 */
final class FindCycle extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly CycleRepository $cycles) {}

    public function handle(mixed ...$arguments): mixed
    {
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
