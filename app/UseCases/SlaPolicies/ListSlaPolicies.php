<?php

declare(strict_types=1);

namespace App\UseCases\SlaPolicies;

use App\Models\SlaPolicy;
use App\Models\User;
use App\Repositories\SlaPolicyRepository;
use Illuminate\Database\Eloquent\Collection;

final class ListSlaPolicies
{
    public function __construct(private readonly SlaPolicyRepository $policies) {}

    /** @return Collection<int, SlaPolicy> */
    public function handle(User $actor): Collection
    {
        abort_unless($actor->is_agent, 403);

        return $this->policies->forWorkspace();
    }
}
