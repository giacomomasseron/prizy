<?php

declare(strict_types=1);

namespace App\UseCases\Cycles;

use App\Models\Cycle;
use App\Repositories\CycleRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class FindCycle
{
    public function __construct(private readonly CycleRepository $cycles) {}

    public function handle(string $id): Cycle
    {
        $cycle = $this->cycles->findViaWorkspace($id);
        if ($cycle === null) {
            throw (new ModelNotFoundException())->setModel(Cycle::class, [$id]);
        }

        return $cycle;
    }
}
