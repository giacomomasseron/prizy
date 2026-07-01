<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Repositories\IssueLabelRepository;
use Illuminate\Support\Collection;

final class ListIssueLabels
{
    public function __construct(private readonly IssueLabelRepository $issueLabels) {}

    public function handle(string $issueId): Collection
    {
        return $this->issueLabels->labelsForIssue($issueId);
    }
}
