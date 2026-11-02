<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Events\IssueUpdated;
use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * @method static Issue run(User $actor, array $data)
 */
final class ArchiveIssue extends BaseUseCase implements UseCaseInterface
{
    private readonly IssueRepository $issues;

    private readonly IssueActivityRepository $activities;

    public function handle(mixed ...$arguments): mixed
    {
        $this->issues = app(IssueRepository::class);
        $this->activities = app(IssueActivityRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): Issue
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
