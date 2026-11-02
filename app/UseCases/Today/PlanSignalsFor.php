<?php

declare(strict_types=1);

namespace App\UseCases\Today;

use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueStarRepository;
use App\Services\HelpdeskAccess;
use App\Services\PlanSignals;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Collection;

/**
 * The plan signals of a batch of issues, for one user and one day (the Today v2 design). The stars and the support
 * module's switch are read once for the whole batch; the issues must carry PlanSignals' relations.
 *
 * @method static array run(User $actor, Collection $issues, string $today)
 */
final class PlanSignalsFor extends BaseUseCase implements UseCaseInterface
{
    private readonly PlanSignals $signals;

    private readonly IssueStarRepository $stars;

    public function handle(mixed ...$arguments): mixed
    {
        $this->signals = app(PlanSignals::class);
        $this->stars = app(IssueStarRepository::class);

        return $this->execute(...$arguments);
    }

    /**
     * @param  Collection<int, Issue>  $issues
     * @param  string  $today  the local date (Y-m-d) of the plan
     * @return array<string, array{score: int, tag: array{label: string, tone: string}|null, reason: string}> by issue id
     */
    private function execute(User $actor, Collection $issues, string $today): array
    {
        $starred = $this->stars->starredAmong($actor->id, $issues->pluck('id')->map(fn (mixed $id): string => (string) $id)->values()->all());
        $helpdesk = HelpdeskAccess::enabledFor($actor->workspace_id);

        $out = [];
        foreach ($issues as $issue) {
            $out[$issue->id] = $this->signals->of($issue, $today, $actor->id, in_array($issue->id, $starred, true), $helpdesk);
        }

        return $out;
    }
}
