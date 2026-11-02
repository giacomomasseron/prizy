<?php

declare(strict_types=1);

namespace App\UseCases\Today;

use App\Models\User;
use App\Models\UserPlanItem;
use App\Repositories\UserPlanItemRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Take an issue off the actor's day plan (the Today v2 design). An issue that is not on the plan → 404.
 *
 * @method static void run(User $actor, string $issueId)
 */
final class RemoveFromPlan extends BaseUseCase implements UseCaseInterface
{
    private readonly UserPlanItemRepository $items;

    public function handle(mixed ...$arguments): mixed
    {
        $this->items = app(UserPlanItemRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor, string $issueId): void
    {
        $item = $this->items->findForUser($actor->id, $issueId);
        if ($item === null) {
            throw (new ModelNotFoundException())->setModel(UserPlanItem::class, [$issueId]);
        }
        $this->items->delete($item);
    }
}
