<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\IssueGithubLink;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

final class GithubLinkRepository
{
    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): IssueGithubLink
    {
        $attributes['id'] ??= (string) Str::uuid();

        return IssueGithubLink::create($attributes)->refresh();
    }

    public function forIssue(string $issueId): Collection
    {
        return IssueGithubLink::query()->where('issue_id', $issueId)->orderBy('created_at')->get();
    }

    public function matching(string $repo, int $number): Collection
    {
        return IssueGithubLink::query()->where('repo', $repo)->where('number', $number)->get();
    }

    public function findInIssue(string $issueId, string $linkId): ?IssueGithubLink
    {
        return IssueGithubLink::query()->where('issue_id', $issueId)->where('id', $linkId)->first();
    }

    public function delete(IssueGithubLink $link): void
    {
        $link->delete();
    }
}
