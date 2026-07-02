<?php

declare(strict_types=1);

namespace App\UseCases\SavedViews;

use App\Models\User;
use App\Repositories\SavedViewRepository;
use Illuminate\Validation\ValidationException;

final class DeleteSavedView
{
    public function __construct(private readonly SavedViewRepository $views) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): void
    {
        $view = $this->views->findInWorkspace((string) $data['saved_view_id']);
        if ($view === null) {
            throw ValidationException::withMessages(['saved_view_id' => ['The selected saved view is invalid.']]);
        }
        $this->views->delete($view);
    }
}
