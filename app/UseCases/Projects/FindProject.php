<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Models\Project;
use App\Repositories\ProjectRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class FindProject
{
    public function __construct(private readonly ProjectRepository $projects) {}

    public function handle(string $id): Project
    {
        $project = $this->projects->findInWorkspace($id);
        if ($project === null) {
            throw (new ModelNotFoundException())->setModel(Project::class, [$id]);
        }

        return $project;
    }
}
