<?php

declare(strict_types=1);

namespace App\UseCases\Today;

use App\Models\User;
use App\Models\UserPlanItem;
use App\Repositories\UserPlanItemRepository;
use App\UseCases\Issues\TransitionIssueStatus;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;

/**
 * Undo completing an issue from the actor's day plan (the Today v2 design): it goes back to the status it had, through
 * the normal status change. Only while the issue is still done and the plan completed it; otherwise 422. The caller
 * has checked the actor may change the issue. An issue that is not on the plan → 404.
 */
final class UndoPlanItem
{
    public function __construct(
        private readonly UserPlanItemRepository $items,
        private readonly TransitionIssueStatus $transition,
    ) {}

    public function handle(User $actor, string $issueId): UserPlanItem
    {
        $item = $this->items->findForUser($actor->id, $issueId);
        if ($item === null) {
            throw (new ModelNotFoundException())->setModel(UserPlanItem::class, [$issueId]);
        }
        $to = $item->previous_status;
        if ($to === null || ! $item->canUndo()) {
            throw ValidationException::withMessages(['status' => ['There is nothing to undo.']]);
        }

        $this->transition->handle($actor, ['issue_id' => $issueId, 'status' => $to]);
        $item->previous_status = null;

        return $this->items->save($item);
    }
}
