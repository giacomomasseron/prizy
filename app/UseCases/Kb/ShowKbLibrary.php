<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use Illuminate\Database\Eloquent\Collection;

final class ShowKbLibrary
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    public function handle(User $actor): Collection
    {
        HelpdeskAccess::gate($actor);

        return $this->kb->libraryTree();
    }
}
