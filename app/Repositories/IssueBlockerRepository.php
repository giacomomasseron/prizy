<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\IssueBlocker;
use Illuminate\Support\Collection;

/**
 * Repository for the issue_blockers join table.
 *
 * IMPORTANT INVARIANT: this table has no workspace_id column and is NOT covered
 * by Row-Level Security. All queries here are GLOBALLY UNSCOPED across tenants.
 * Every caller MUST validate the parent issue(s) via IssueRepository::findInWorkspace
 * before reading or writing edges, so that tenant isolation is enforced at the
 * use-case layer rather than at the DB level.
 */
final class IssueBlockerRepository
{
    public function exists(string $blocking, string $blocked): bool
    {
        return IssueBlocker::where('blocking_issue_id', $blocking)
            ->where('blocked_issue_id', $blocked)
            ->exists();
    }

    public function create(string $blocking, string $blocked, string $actorId): IssueBlocker
    {
        return IssueBlocker::create([
            'blocking_issue_id' => $blocking,
            'blocked_issue_id'  => $blocked,
            'created_by'        => $actorId,
        ]);
    }

    public function delete(string $blocking, string $blocked): int
    {
        return IssueBlocker::where('blocking_issue_id', $blocking)
            ->where('blocked_issue_id', $blocked)
            ->delete();
    }

    /** Edges where the given issue is the blocker. @return Collection<int, IssueBlocker> */
    public function blocking(string $blockingId): Collection
    {
        return IssueBlocker::where('blocking_issue_id', $blockingId)->get();
    }

    /** Edges where the given issue is blocked. @return Collection<int, IssueBlocker> */
    public function blockersOf(string $blockedId): Collection
    {
        return IssueBlocker::where('blocked_issue_id', $blockedId)->get();
    }
}
