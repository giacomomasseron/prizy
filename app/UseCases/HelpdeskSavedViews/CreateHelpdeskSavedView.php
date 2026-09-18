<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedViews;

use App\Models\HelpdeskSavedView;
use App\Models\User;
use App\Repositories\HelpdeskSavedViewRepository;
use App\Services\HelpdeskAccess;

final class CreateHelpdeskSavedView
{
    public function __construct(private readonly HelpdeskSavedViewRepository $views) {}

    /** @param array<string,mixed> $data */
    public function handle(User $actor, array $data): HelpdeskSavedView
    {
        HelpdeskAccess::gate($actor);

        return $this->views->create([
            'name' => $data['name'],
            'created_by' => $actor->id,
            'definition' => $data['definition'],
        ]);
    }
}
