<?php

declare(strict_types=1);

namespace App\UseCases\HelpdeskSavedViews;

use App\Models\HelpdeskSavedView;
use App\Models\User;
use App\Repositories\HelpdeskSavedViewRepository;
use Illuminate\Database\Eloquent\Collection;

final class ListHelpdeskSavedViews
{
    public function __construct(private readonly HelpdeskSavedViewRepository $views) {}

    /** @return Collection<int, HelpdeskSavedView> */
    public function handle(User $actor): Collection
    {
        abort_unless($actor->is_agent, 403);

        return $this->views->forWorkspace();
    }
}
