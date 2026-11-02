<?php

declare(strict_types=1);

namespace App\UseCases\Labels;

use App\Repositories\LabelRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * @method CursorPaginator run(int $limit)
 */
final class ListLabels extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly LabelRepository $labels) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(int $limit): CursorPaginator
    {
        return $this->labels->paginate($limit);
    }
}
