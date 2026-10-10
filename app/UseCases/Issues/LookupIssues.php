<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\Issue;
use App\Repositories\IssueRepository;
use Illuminate\Database\Eloquent\Collection;

/** The issue picker's lookup (PRD §3.2.1): issues by `PRZ-` reference or by title. */
final class LookupIssues
{
    /** The picker shows at most this many issues. */
    public const LIMIT = 8;

    public function __construct(
        private readonly IssueRepository $issues,
    ) {}

    /** @return Collection<int, Issue> */
    public function handle(string $q): Collection
    {
        return $this->issues->lookup($q, self::LIMIT);
    }
}
