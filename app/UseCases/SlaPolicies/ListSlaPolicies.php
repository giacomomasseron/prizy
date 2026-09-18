<?php

declare(strict_types=1);

namespace App\UseCases\SlaPolicies;

use App\Models\SlaPolicy;
use App\Models\User;
use App\Repositories\SlaPolicyRepository;
use App\Services\HelpdeskAccess;
use Illuminate\Database\Eloquent\Collection;

final class ListSlaPolicies
{
    public function __construct(private readonly SlaPolicyRepository $policies) {}

    /** @return Collection<int, SlaPolicy> */
    public function handle(User $actor): Collection
    {
        HelpdeskAccess::gate($actor);

        return $this->policies->forWorkspace();
    }
}
