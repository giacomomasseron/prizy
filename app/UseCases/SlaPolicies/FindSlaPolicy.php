<?php

declare(strict_types=1);

namespace App\UseCases\SlaPolicies;

use App\Models\SlaPolicy;
use App\Models\User;
use App\Repositories\SlaPolicyRepository;

final class FindSlaPolicy
{
    public function __construct(private readonly SlaPolicyRepository $policies) {}

    public function handle(User $actor, string $id): SlaPolicy
    {
        abort_unless($actor->is_agent, 403);
        $policy = $this->policies->find($id);
        abort_unless($policy !== null, 404);

        return $policy;
    }
}
