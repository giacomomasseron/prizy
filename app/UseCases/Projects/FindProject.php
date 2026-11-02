<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Models\Project;
use App\Repositories\ProjectRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @method static Project run(string $id)
 */
final class FindProject extends BaseUseCase implements UseCaseInterface
{
    private readonly ProjectRepository $projects;

    public function handle(mixed ...$arguments): mixed
    {
        $this->projects = app(ProjectRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(string $id): Project
    {
        $project = $this->projects->findInWorkspace($id);
        if ($project === null) {
            throw (new ModelNotFoundException())->setModel(Project::class, [$id]);
        }

        return $project;
    }
}
