<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Events\IssueUpdated;
use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class ArchiveIssue
{
    public function __construct(
        private readonly IssueRepository $issues,
        private readonly IssueActivityRepository $activities,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Issue
    {
        $issue = $this->issues->findInWorkspace((string) $data['issue_id']);

        if ($issue === null) {
            throw ValidationException::withMessages(['issue_id' => ['The selected issue is invalid.']]);
        }

        if ($issue->archived_at !== null) {
            return $issue;
        }

        DB::transaction(function () use ($issue, $actor): void {
            $this->issues->update($issue, ['archived_at' => now()]);
            $this->activities->log($issue->id, $actor->id, 'archived', null, null);
        });

        event(new IssueUpdated($issue));

        return $issue;
    }
}
