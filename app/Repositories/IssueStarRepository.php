<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\IssueStar;
use Carbon\CarbonInterface;

final class IssueStarRepository
{
    /**
     * Star an issue for a user. Idempotent: the insert ignores a conflict, so starring a starred issue keeps its
     * first starred_at and never fails on a double click. Returns when the issue was starred.
     */
    public function star(string $userId, string $issueId): CarbonInterface
    {
        IssueStar::query()->insertOrIgnore([
            'user_id' => $userId,
            'issue_id' => $issueId,
            'created_at' => now(),
        ]);

        return IssueStar::query()
            ->where('user_id', $userId)
            ->where('issue_id', $issueId)
            ->firstOrFail()
            ->created_at;
    }

    /**
     * The ids among `$issueIds` that the user starred.
     *
     * @param  list<string>  $issueIds
     * @return list<string>
     */
    public function starredAmong(string $userId, array $issueIds): array
    {
        if ($issueIds === []) {
            return [];
        }

        return IssueStar::query()->where('user_id', $userId)->whereIn('issue_id', $issueIds)
            ->pluck('issue_id')->map(fn (mixed $id): string => (string) $id)->values()->all();
    }

    /** Unstar an issue for a user. Idempotent: unstarring an unstarred issue changes nothing. */
    public function unstar(string $userId, string $issueId): void
    {
        IssueStar::query()
            ->where('user_id', $userId)
            ->where('issue_id', $issueId)
            ->delete();
    }
}
