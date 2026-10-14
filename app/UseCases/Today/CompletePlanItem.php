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
 * Complete an issue from the actor's day plan (the Today v2 design): it moves to Done through the normal status change
 * (activity, notifications, completed_at), and the plan item keeps the status it had, for Undo. The caller has
 * checked the actor may change the issue. An issue that is not on the plan → 404; one already done → 422.
 */
final class CompletePlanItem
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
        $from = (string) $item->issue?->status;
        if ($from === 'done') {
            throw ValidationException::withMessages(['status' => ['The issue is already done.']]);
        }

        // The status change runs its own transaction and fires its events once it commits; the previous status is
        // kept only after the issue is really done.
        $this->transition->handle($actor, ['issue_id' => $issueId, 'status' => 'done']);
        $item->previous_status = $from;
        // Undo compares the completion with this stamp, so it must move on every Done (an unchanged status leaves the row clean).
        $item->updated_at = $item->freshTimestamp();

        return $this->items->save($item);
    }
}
