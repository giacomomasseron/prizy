<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\IssueComment;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Str;

final class IssueCommentRepository
{
    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): IssueComment
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }

        return IssueComment::create($attributes);
    }

    public function paginateForIssue(string $issueId, int $limit): CursorPaginator
    {
        return IssueComment::where('issue_id', $issueId)
            ->with('reactions')
            ->orderBy('created_at')
            ->orderBy('id')
            ->cursorPaginate(perPage: $limit, cursorName: 'after');
    }

    public function findForIssue(string $commentId, string $issueId): ?IssueComment
    {
        return IssueComment::query()->where('id', $commentId)->where('issue_id', $issueId)->first();
    }
}
