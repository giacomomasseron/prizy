<?php

declare(strict_types=1);

namespace App\UseCases\SlaPolicies;

use App\Models\User;
use App\Repositories\SlaPolicyRepository;

final class DeleteSlaPolicy
{
    public function __construct(private readonly SlaPolicyRepository $policies) {}

    public function handle(User $actor, string $id): void
    {
        abort_unless($actor->is_agent, 403);
        $policy = $this->policies->find($id);
        abort_unless($policy !== null, 404);

        $this->policies->delete($policy);
    }
}
