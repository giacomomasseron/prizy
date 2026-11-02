<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Models\User;
use App\Repositories\ProjectRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static void run(User $actor, array $data)
 */
final class DeleteProject extends BaseUseCase implements UseCaseInterface
{
    private readonly ProjectRepository $projects;

    public function handle(mixed ...$arguments): mixed
    {
        $this->projects = app(ProjectRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): void
    {
        $project = $this->projects->findInWorkspace((string) $data['project_id']);
        if ($project === null) {
            throw ValidationException::withMessages(['project_id' => ['The selected project is invalid.']]);
        }
        $this->projects->delete($project);
    }
}
