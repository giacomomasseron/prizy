<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Repositories\IssueLabelRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Collection;

/**
 * @method static Collection run(string $issueId)
 */
final class ListIssueLabels extends BaseUseCase implements UseCaseInterface
{
    private readonly IssueLabelRepository $issueLabels;

    public function handle(mixed ...$arguments): mixed
    {
        $this->issueLabels = app(IssueLabelRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(string $issueId): Collection
    {
        return $this->issueLabels->labelsForIssue($issueId);
    }
}
