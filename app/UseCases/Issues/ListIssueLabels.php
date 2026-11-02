<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Repositories\IssueLabelRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Collection;

/**
 * @method Collection run(string $issueId)
 */
final class ListIssueLabels extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly IssueLabelRepository $issueLabels) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(string $issueId): Collection
    {
        return $this->issueLabels->labelsForIssue($issueId);
    }
}
