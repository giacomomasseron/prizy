<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Models\Project;
use App\Models\ProjectMessage;
use App\Models\User;
use App\Repositories\IssueRepository;
use App\Repositories\ProjectMessageRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Post a message in a project's chat (PRD §3.2.11), linking the issues picked while writing it. Every linked issue
 * must be a live issue of the workspace (another workspace's or a deleted one → 422).
 */
final class PostProjectMessage
{
    public function __construct(
        private readonly ProjectMessageRepository $messages,
        private readonly IssueRepository $issues,
    ) {}

    /** @param list<string> $issueIds */
    public function handle(User $actor, Project $project, string $body, array $issueIds): ProjectMessage
    {
        if (count($this->issues->findManyByIds($issueIds)) !== count($issueIds)) {
            throw ValidationException::withMessages(['issue_ids' => ['The selected issues are invalid.']]);
        }

        return DB::transaction(fn (): ProjectMessage => $this->messages->create($project->id, $actor->id, $body, $issueIds));
    }
}
