<?php

declare(strict_types=1);

namespace App\UseCases\SavedViews;

use App\Models\SavedView;
use App\Models\User;
use App\Repositories\SavedViewRepository;

final class CreateSavedView
{
    public function __construct(private readonly SavedViewRepository $views) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): SavedView
    {
        return $this->views->create([
            'name'       => $data['name'],
            'definition' => $data['definition'],
            'created_by' => $actor->id,
        ]);
    }
}
