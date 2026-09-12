<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use Illuminate\Database\Eloquent\Collection;

final class ShowKbLibrary
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    public function handle(User $actor): Collection
    {
        abort_unless($actor->is_agent, 403);

        return $this->kb->libraryTree();
    }
}
