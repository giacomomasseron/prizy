<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\IssueStar;
use Carbon\CarbonInterface;

/** A user's personal stars (PRD §3.2.9), read for IssueResource: one query for all of the user's stars. */
final class StarredIssues
{
    /** @return array<string, CarbonInterface> issue_id => when the user starred it */
    public function mapFor(string $userId): array
    {
        return IssueStar::query()
            ->where('user_id', $userId)
            ->get(['issue_id', 'created_at'])
            ->mapWithKeys(fn (IssueStar $star): array => [$star->issue_id => $star->created_at])
            ->all();
    }
}
