<?php

declare(strict_types=1);

namespace App\UseCases\Milestones;

use App\Models\Milestone;
use App\Models\Project;
use App\Models\User;
use App\Repositories\MilestoneRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static Milestone run(User $actor, array $data)
 */
final class CreateMilestone extends BaseUseCase implements UseCaseInterface
{
    private readonly MilestoneRepository $milestones;

    public function handle(mixed ...$arguments): mixed
    {
        $this->milestones = app(MilestoneRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): Milestone
    {
        if (Project::find((string) $data['project_id']) === null) {
            throw ValidationException::withMessages(['project_id' => ['The selected project is invalid.']]);
        }

        return $this->milestones->create([
            'project_id'  => $data['project_id'],
            'name'        => $data['name'],
            'target_date' => $data['target_date'],
        ]);
    }
}
