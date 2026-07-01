<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Models\User;
use App\Repositories\ProjectRepository;
use Illuminate\Validation\ValidationException;

final class DeleteProject
{
    public function __construct(private readonly ProjectRepository $projects) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): void
    {
        $project = $this->projects->findInWorkspace((string) $data['project_id']);
        if ($project === null) {
            throw ValidationException::withMessages(['project_id' => ['The selected project is invalid.']]);
        }
        $this->projects->delete($project);
    }
}
