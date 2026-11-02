<?php

declare(strict_types=1);

namespace App\UseCases\Roadmap;

use App\Repositories\ProjectRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method Collection run()
 */
final class ListRoadmap extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly ProjectRepository $projects) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return Collection<int, \App\Models\Project> */
    private function execute(): Collection
    {
        return $this->projects->allWithMilestones();
    }
}
