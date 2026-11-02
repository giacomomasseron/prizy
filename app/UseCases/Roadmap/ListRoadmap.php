<?php

declare(strict_types=1);

namespace App\UseCases\Roadmap;

use App\Repositories\ProjectRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method static Collection run()
 */
final class ListRoadmap extends BaseUseCase implements UseCaseInterface
{
    private readonly ProjectRepository $projects;

    public function handle(mixed ...$arguments): mixed
    {
        $this->projects = app(ProjectRepository::class);

        return $this->execute(...$arguments);
    }

    /** @return Collection<int, \App\Models\Project> */
    private function execute(): Collection
    {
        return $this->projects->allWithMilestones();
    }
}
