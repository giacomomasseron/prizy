<?php

declare(strict_types=1);

namespace App\UseCases\SavedViews;

use App\Models\SavedView;
use App\Repositories\SavedViewRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @method SavedView run(string $id)
 */
final class FindSavedView extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly SavedViewRepository $views) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(string $id): SavedView
    {
        $view = $this->views->findInWorkspace($id);
        if ($view === null) {
            throw (new ModelNotFoundException())->setModel(SavedView::class, [$id]);
        }

        return $view;
    }
}
