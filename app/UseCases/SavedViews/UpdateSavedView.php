<?php

declare(strict_types=1);

namespace App\UseCases\SavedViews;

use App\Models\SavedView;
use App\Models\User;
use App\Repositories\SavedViewRepository;
use Illuminate\Validation\ValidationException;

final class UpdateSavedView
{
    public function __construct(private readonly SavedViewRepository $views) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): SavedView
    {
        $view = $this->views->findInWorkspace((string) $data['saved_view_id']);
        if ($view === null) {
            throw ValidationException::withMessages(['saved_view_id' => ['The selected saved view is invalid.']]);
        }

        return $this->views->update($view, array_intersect_key($data, array_flip(['name', 'definition'])));
    }
}
