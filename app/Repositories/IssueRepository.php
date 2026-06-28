<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Issue;
use Illuminate\Support\Str;

final class IssueRepository
{
    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): Issue
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }

        $issue = Issue::create($attributes);
        $issue->refresh();

        return $issue;
    }

    /** @param array<string, mixed> $attributes */
    public function update(Issue $issue, array $attributes): Issue
    {
        $issue->update($attributes);

        return $issue;
    }

    /** Scoped to the current workspace by WorkspaceScope + RLS. */
    public function findInWorkspace(string $id): ?Issue
    {
        return Issue::find($id);
    }
}
