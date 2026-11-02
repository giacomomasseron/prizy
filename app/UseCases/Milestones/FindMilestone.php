<?php

declare(strict_types=1);

namespace App\UseCases\Milestones;

use App\Models\Milestone;
use App\Repositories\MilestoneRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @method static Milestone run(string $id)
 */
final class FindMilestone extends BaseUseCase implements UseCaseInterface
{
    private readonly MilestoneRepository $milestones;

    public function handle(mixed ...$arguments): mixed
    {
        $this->milestones = app(MilestoneRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(string $id): Milestone
    {
        $milestone = $this->milestones->findViaWorkspace($id);
        if ($milestone === null) {
            throw (new ModelNotFoundException())->setModel(Milestone::class, [$id]);
        }

        return $milestone;
    }
}
