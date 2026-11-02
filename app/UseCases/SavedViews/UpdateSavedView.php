<?php

declare(strict_types=1);

namespace App\UseCases\SavedViews;

use App\Models\SavedView;
use App\Models\User;
use App\Repositories\SavedViewRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static SavedView run(User $actor, array $data)
 */
final class UpdateSavedView extends BaseUseCase implements UseCaseInterface
{
    private readonly SavedViewRepository $views;

    public function handle(mixed ...$arguments): mixed
    {
        $this->views = app(SavedViewRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): SavedView
    {
        $view = $this->views->findInWorkspace((string) $data['saved_view_id']);
        if ($view === null) {
            throw ValidationException::withMessages(['saved_view_id' => ['The selected saved view is invalid.']]);
        }

        return $this->views->update($view, array_intersect_key($data, array_flip(['name', 'definition'])));
    }
}
