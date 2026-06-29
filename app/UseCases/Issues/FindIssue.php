<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\Issue;
use App\Repositories\IssueRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class FindIssue
{
    public function __construct(
        private readonly IssueRepository $issues,
    ) {}

    public function handle(string $id): Issue
    {
        $issue = $this->issues->findInWorkspace($id);

        if ($issue === null) {
            throw (new ModelNotFoundException())->setModel(Issue::class, [$id]);
        }

        return $issue;
    }
}
