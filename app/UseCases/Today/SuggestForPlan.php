<?php

declare(strict_types=1);

namespace App\UseCases\Today;

use App\Models\Issue;
use App\Models\User;
use App\Repositories\UserPlanItemRepository;
use App\Services\PlanTime;
use Carbon\CarbonImmutable;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * What could also fit today (the Today v2 design): the actor's open issues (assigned to them or starred) that are not
 * on their plan, ranked by their plan signals — the score, then the priority, then the longest untouched — with the
 * time each would start with on the plan.
 *
 * @method static array run(User $actor, CarbonImmutable $dayStart)
 */
final class SuggestForPlan extends BaseUseCase implements UseCaseInterface
{
    /** How many suggestions Today shows. */
    public const LIMIT = 8;

    private const PRIORITY_RANK = ['urgent' => 0, 'high' => 1, 'medium' => 2, 'low' => 3, 'no_priority' => 4];

    private readonly UserPlanItemRepository $items;

    public function handle(mixed ...$arguments): mixed
    {
        $this->items = app(UserPlanItemRepository::class);

        return $this->execute(...$arguments);
    }

    /** @return list<array{issue: Issue, minutes: int, signals: array{score: int, tag: array{label: string, tone: string}|null, reason: string}}> */
    private function execute(User $actor, CarbonImmutable $dayStart): array
    {
        $pool = $this->items->suggestionPool($actor->id);
        $signals = PlanSignalsFor::run($actor, $pool, $dayStart->format('Y-m-d'));

        return $pool
            ->sort(fn (Issue $a, Issue $b): int => [$signals[$b->id]['score'], self::PRIORITY_RANK[$a->priority] ?? 5, $a->updated_at?->getTimestamp() ?? 0, $a->id]
                <=> [$signals[$a->id]['score'], self::PRIORITY_RANK[$b->priority] ?? 5, $b->updated_at?->getTimestamp() ?? 0, $b->id])
            ->take(self::LIMIT)
            ->map(fn (Issue $issue): array => [
                'issue' => $issue,
                'minutes' => PlanTime::defaultMinutes($issue->estimate),
                'signals' => $signals[$issue->id],
            ])
            ->values()->all();
    }
}
