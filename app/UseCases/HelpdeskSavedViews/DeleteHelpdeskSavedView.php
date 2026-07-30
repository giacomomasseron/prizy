<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedViews;

use App\Models\User;
use App\Repositories\HelpdeskSavedViewRepository;

final class DeleteHelpdeskSavedView
{
    public function __construct(private readonly HelpdeskSavedViewRepository $views) {}

    public function handle(User $actor, string $id): void
    {
        abort_unless($actor->is_agent, 403);
        $view = $this->views->findInWorkspace($id);
        abort_unless($view !== null, 404);

        $this->views->delete($view);
    }
}
