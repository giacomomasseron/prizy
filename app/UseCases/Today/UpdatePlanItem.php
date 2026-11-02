<?php

declare(strict_types=1);

namespace App\UseCases\Today;

use App\Models\User;
use App\Models\UserPlanItem;
use App\Repositories\UserPlanItemRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * Change an item of the actor's day plan (the Today v2 design): its time or its place. An issue that is not on the
 * actor's plan → 404. When a move crowds two open items, the actor's open items are renumbered.
 *
 * @method UserPlanItem run(User $actor, string $issueId, array $changes)
 */
final class UpdatePlanItem extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly UserPlanItemRepository $items) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param array{minutes?: int, position?: float} $changes */
    private function execute(User $actor, string $issueId, array $changes): UserPlanItem
    {
        $item = $this->items->findForUser($actor->id, $issueId);
        if ($item === null) {
            throw (new ModelNotFoundException())->setModel(UserPlanItem::class, [$issueId]);
        }
        if (array_key_exists('minutes', $changes)) {
            $item->minutes = $changes['minutes'];
        }
        if (array_key_exists('position', $changes)) {
            $item->position = $changes['position'];
        }

        return DB::transaction(function () use ($actor, $item): UserPlanItem {
            $this->items->save($item);
            if ($this->items->openPositionsCrowded($actor->id)) {
                $this->items->renumberOpen($actor->id);
            }

            return $item->refresh()->load('issue.project:id,name,color');
        });
    }
}
