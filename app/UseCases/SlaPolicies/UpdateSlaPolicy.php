<?php

declare(strict_types=1);

namespace App\UseCases\SlaPolicies;

use App\Models\SlaPolicy;
use App\Models\User;
use App\Repositories\SlaPolicyRepository;
use App\Services\HelpdeskAccess;

final class UpdateSlaPolicy
{
    public function __construct(private readonly SlaPolicyRepository $policies) {}

    /** @param array<string,mixed> $data */
    public function handle(User $actor, string $id, array $data): SlaPolicy
    {
        HelpdeskAccess::gate($actor);
        $policy = $this->policies->find($id);
        abort_unless($policy !== null, 404);

        return $this->policies->update($policy, [
            'name' => $data['name'],
            'first_reply_minutes' => $data['first_reply_minutes'],
            'next_reply_minutes' => $data['next_reply_minutes'] ?? null,
            'resolution_minutes' => $data['resolution_minutes'],
            'schedule_id' => $data['schedule_id'] ?? null,
        ]);
    }
}
