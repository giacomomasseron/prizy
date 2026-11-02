<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Models\Project;
use App\Repositories\ProjectRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @method Project run(string $id)
 */
final class FindProject extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly ProjectRepository $projects) {}

    public function handle(mixed ...$arguments): mixed
    {
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
