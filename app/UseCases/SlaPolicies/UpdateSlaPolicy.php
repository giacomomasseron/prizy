<?php

declare(strict_types=1);

namespace App\UseCases\SlaPolicies;

use App\Models\SlaPolicy;
use App\Models\User;
use App\Repositories\SlaPolicyRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static SlaPolicy run(User $actor, string $id, array $data)
 */
final class UpdateSlaPolicy extends BaseUseCase implements UseCaseInterface
{
    private readonly SlaPolicyRepository $policies;

    public function handle(mixed ...$arguments): mixed
    {
        $this->policies = app(SlaPolicyRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array<string,mixed> $data */
    private function execute(User $actor, string $id, array $data): SlaPolicy
    {
        HelpdeskAccess::gateWrite($actor);
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
