<?php

declare(strict_types=1);

namespace App\UseCases\Milestones;

use App\Models\Milestone;
use App\Models\User;
use App\Repositories\MilestoneRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static Milestone run(User $actor, array $data)
 */
final class UpdateMilestone extends BaseUseCase implements UseCaseInterface
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
        $milestone = $this->milestones->findViaWorkspace((string) $data['milestone_id']);
        if ($milestone === null) {
            throw ValidationException::withMessages(['milestone_id' => ['The selected milestone is invalid.']]);
        }

        return $this->milestones->update($milestone, array_intersect_key($data, array_flip(['name', 'target_date'])));
    }
}
