<?php

declare(strict_types=1);

namespace App\UseCases\Today;

use App\Models\User;
use App\Models\UserPlanItem;
use App\Repositories\UserPlanItemRepository;
use Carbon\CarbonImmutable;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * The actor's day plan (the Today v2 design): the open items in their order, each with its tag and reason; the items
 * whose issue was completed since the start of the actor's day; and the daily focus capacity.
 *
 * @method static array run(User $actor, CarbonImmutable $dayStart)
 */
final class ShowPlan extends BaseUseCase implements UseCaseInterface
{
    private readonly UserPlanItemRepository $items;

    public function handle(mixed ...$arguments): mixed
    {
        $this->items = app(UserPlanItemRepository::class);

        return $this->execute(...$arguments);
    }

    /**
     * @param  CarbonImmutable  $dayStart  the actor's local midnight (its offset gives the local date)
     * @return array{capacity_minutes: int, items: list<array{item: UserPlanItem, signals: array{score: int, tag: array{label: string, tone: string}|null, reason: string}|null}>, done_today: list<array{item: UserPlanItem, signals: null}>}
     */
    private function execute(User $actor, CarbonImmutable $dayStart): array
    {
        $open = $this->items->openItems($actor->id);
        $signals = PlanSignalsFor::run($actor, $open->pluck('issue'), $dayStart->format('Y-m-d'));

        return [
            'capacity_minutes' => (int) $actor->daily_focus_minutes,
            'items' => $open->map(fn (UserPlanItem $item): array => ['item' => $item, 'signals' => $signals[$item->issue_id] ?? null])->values()->all(),
            'done_today' => $this->items->doneSince($actor->id, $dayStart)
                ->map(fn (UserPlanItem $item): array => ['item' => $item, 'signals' => null])->values()->all(),
        ];
    }
}
