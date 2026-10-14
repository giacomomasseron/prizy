<?php

declare(strict_types=1);

namespace App\UseCases\Today;

use App\Models\User;
use App\Models\UserPlanItem;
use App\Repositories\IssueRepository;
use App\Repositories\UserPlanItemRepository;
use App\Services\PlanTime;
use Illuminate\Validation\ValidationException;

/**
 * Put an issue on the end of the actor's day plan (the Today v2 design). It must be a live, open, unarchived issue of
 * the workspace; an issue already on the plan comes back unchanged. The time defaults to an hour a story point.
 */
final class AddToPlan
{
    /** The most open issues a plan holds. */
    public const MAX_OPEN = 20;

    public function __construct(
        private readonly UserPlanItemRepository $items,
        private readonly IssueRepository $issues,
    ) {}

    /** @return array{item: UserPlanItem, created: bool} */
    public function handle(User $actor, string $issueId, ?int $minutes): array
    {
        $issue = $this->issues->findInWorkspace($issueId);
        if ($issue === null) {
            throw ValidationException::withMessages(['issue_id' => ['The selected issue is invalid.']]);
        }
        if (in_array($issue->status, ['done', 'cancelled'], true) || $issue->archived_at !== null) {
            throw ValidationException::withMessages(['issue_id' => ['Only an open issue can go on the plan.']]);
        }

        $existing = $this->items->findForUser($actor->id, $issue->id);
        if ($existing !== null) {
            return ['item' => $existing, 'created' => false];
        }
        if ($this->items->countOpen($actor->id) >= self::MAX_OPEN) {
            throw ValidationException::withMessages(['issue_id' => ['Your plan holds '.self::MAX_OPEN.' issues at most.']]);
        }

        $item = $this->items->create($actor->id, $issue->id, $minutes ?? PlanTime::defaultMinutes($issue->estimate), $this->items->endPosition($actor->id));

        return ['item' => $item, 'created' => true];
    }
}
