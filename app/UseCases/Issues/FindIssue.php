<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\Issue;
use App\Repositories\IssueRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @method static Issue run(string $id)
 */
final class FindIssue extends BaseUseCase implements UseCaseInterface
{
    private readonly IssueRepository $issues;

    public function handle(mixed ...$arguments): mixed
    {
        $this->issues = app(IssueRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(string $id): Issue
    {
        $issue = $this->issues->findInWorkspace($id);

        if ($issue === null) {
            throw (new ModelNotFoundException())->setModel(Issue::class, [$id]);
        }

        return $issue;
    }
}
