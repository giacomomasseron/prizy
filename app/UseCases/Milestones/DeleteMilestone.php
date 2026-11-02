<?php

declare(strict_types=1);

namespace App\UseCases\Milestones;

use App\Models\User;
use App\Repositories\MilestoneRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method void run(User $actor, array $data)
 */
final class DeleteMilestone extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly MilestoneRepository $milestones) {}

    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): void
    {
        $milestone = $this->milestones->findViaWorkspace((string) $data['milestone_id']);
        if ($milestone === null) {
            throw ValidationException::withMessages(['milestone_id' => ['The selected milestone is invalid.']]);
        }
        $this->milestones->delete($milestone);
    }
}
