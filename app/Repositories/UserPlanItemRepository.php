<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Issue;
use App\Models\UserPlanItem;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Collection;

/**
 * The day plan (the Today v2 design). Every query filters by the user: nobody reads another user's plan. An item is
 * "open" while its issue is open (not done or cancelled), not archived and not deleted.
 */
final class UserPlanItemRepository
{
    /** Two open items closer than this are renumbered 1, 2, 3… (repeated halving runs out of precision). */
    public const MIN_GAP = 1e-6;

    /** What the plan signals read, loaded with each issue. */
    public const SIGNAL_RELATIONS = [
        'project:id,name,color',
        'cycle',
        'supportTickets.slaPolicy.schedule',
        'supportTickets.slaBreaches',
        'supportTickets.latestPublicMessage',
        'issueBlockersAsBlockingIssue.blockedIssue',
    ];

    /** @return Collection<int, UserPlanItem> the user's open items by position, issues loaded for the signals */
    public function openItems(string $userId): Collection
    {
        return $this->open($userId)
            ->with(['issue' => fn ($q) => $q->with(self::SIGNAL_RELATIONS)])
            ->orderBy('position')->orderBy('id')
            ->get();
    }

    public function countOpen(string $userId): int
    {
        return $this->open($userId)->count();
    }

    /** @return Collection<int, UserPlanItem> the user's items whose issue was completed since `$since`, newest first */
    public function doneSince(string $userId, CarbonInterface $since): Collection
    {
        // Laravel binds a date without its offset, so compare in UTC (the database's zone): `$since` is the caller's
        // local midnight, with whatever offset the caller has.
        $since = $since->copy()->utc();

        return UserPlanItem::query()->where('user_id', $userId)
            ->whereHas('issue', fn (Builder $q) => $q->where('status', 'done')->where('completed_at', '>=', $since))
            ->with('issue.project:id,name,color')
            ->get()
            ->sortByDesc(fn (UserPlanItem $item) => $item->issue?->completed_at)
            ->values();
    }

    /** Null when the issue is not on the user's plan, or was deleted (another user's plan is never reachable). */
    public function findForUser(string $userId, string $issueId): ?UserPlanItem
    {
        return UserPlanItem::query()->with('issue.project:id,name,color')
            ->where('user_id', $userId)->where('issue_id', $issueId)->whereHas('issue')->first();
    }

    /** The position that puts a new item after every open one. */
    public function endPosition(string $userId): float
    {
        $max = $this->open($userId)->max('position');

        return $max === null ? 0.0 : (float) $max + 1;
    }

    public function create(string $userId, string $issueId, int $minutes, float $position): UserPlanItem
    {
        $item = UserPlanItem::query()->create([
            'user_id' => $userId,
            'issue_id' => $issueId,
            'minutes' => $minutes,
            'position' => $position,
        ]);

        return $item->load('issue.project:id,name,color');
    }

    public function save(UserPlanItem $item): UserPlanItem
    {
        $item->save();

        return $item->load('issue.project:id,name,color');
    }

    public function delete(UserPlanItem $item): void
    {
        $item->delete();
    }

    /** True when two of the user's open items sit closer than MIN_GAP. */
    public function openPositionsCrowded(string $userId): bool
    {
        $positions = $this->open($userId)->orderBy('position')->pluck('position')->map(fn (mixed $p): float => (float) $p)->all();
        for ($i = 1; $i < count($positions); $i++) {
            if ($positions[$i] - $positions[$i - 1] < self::MIN_GAP) {
                return true;
            }
        }

        return false;
    }

    /** Renumber the user's open items 1, 2, 3… in their current order. */
    public function renumberOpen(string $userId): void
    {
        $ids = $this->open($userId)->orderBy('position')->orderBy('id')->pluck('id');
        foreach ($ids as $i => $id) {
            UserPlanItem::query()->whereKey($id)->update(['position' => $i + 1]);
        }
    }

    /**
     * What could also fit today: the open, unarchived issues assigned to or starred by the user that are not on their
     * plan, loaded for the signals.
     *
     * @return Collection<int, Issue>
     */
    public function suggestionPool(string $userId): Collection
    {
        return Issue::query()
            ->whereNotIn('status', ['done', 'cancelled'])->whereNull('archived_at')
            ->where(fn (Builder $q) => $q->where('assignee_id', $userId)->orWhereExists(
                fn (QueryBuilder $stars) => $stars->selectRaw('1')->from('issue_stars')
                    ->whereColumn('issue_stars.issue_id', 'issues.id')->where('issue_stars.user_id', $userId),
            ))
            ->whereNotExists(
                fn (QueryBuilder $plan) => $plan->selectRaw('1')->from('user_plan_items')
                    ->whereColumn('user_plan_items.issue_id', 'issues.id')->where('user_plan_items.user_id', $userId),
            )
            ->with(self::SIGNAL_RELATIONS)
            ->get();
    }

    /** @return Builder<UserPlanItem> */
    private function open(string $userId): Builder
    {
        return UserPlanItem::query()->where('user_id', $userId)
            ->whereHas('issue', fn (Builder $q) => $q->whereNotIn('status', ['done', 'cancelled'])->whereNull('archived_at'));
    }
}
