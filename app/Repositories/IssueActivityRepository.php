<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\IssueActivity;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Str;

final class IssueActivityRepository
{
    public function log(
        string $issueId,
        ?string $actorId,
        string $type,
        ?string $from = null,
        ?string $to = null,
    ): IssueActivity {
        return IssueActivity::create([
            'id'         => (string) Str::uuid(),
            'issue_id'   => $issueId,
            'user_id'    => $actorId,
            'type'       => $type,
            'from_value' => $from,
            'to_value'   => $to,
        ]);
    }

    public function paginateForIssue(string $issueId, int $limit): CursorPaginator
    {
        return IssueActivity::where('issue_id', $issueId)
            ->orderBy('created_at')
            ->orderBy('id')
            ->cursorPaginate(perPage: $limit, cursorName: 'after');
    }
}
