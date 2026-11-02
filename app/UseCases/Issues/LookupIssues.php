<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\Issue;
use App\Repositories\IssueRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * The issue picker's lookup (PRD §3.2.1): issues by `PRZ-` reference or by title.
 *
 * @method static Collection run(string $q)
 */
final class LookupIssues extends BaseUseCase implements UseCaseInterface
{
    /** The picker shows at most this many issues. */
    public const LIMIT = 8;

    private readonly IssueRepository $issues;

    public function handle(mixed ...$arguments): mixed
    {
        $this->issues = app(IssueRepository::class);

        return $this->execute(...$arguments);
    }

    /** @return Collection<int, Issue> */
    private function execute(string $q): Collection
    {
        return $this->issues->lookup($q, self::LIMIT);
    }
}
