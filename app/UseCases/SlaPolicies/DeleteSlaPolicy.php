<?php

declare(strict_types=1);

namespace App\UseCases\SlaPolicies;

use App\Models\User;
use App\Repositories\SlaPolicyRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method static void run(User $actor, string $id)
 */
final class DeleteSlaPolicy extends BaseUseCase implements UseCaseInterface
{
    private readonly SlaPolicyRepository $policies;

    public function handle(mixed ...$arguments): mixed
    {
        $this->policies = app(SlaPolicyRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor, string $id): void
    {
        HelpdeskAccess::gateWrite($actor);
        $policy = $this->policies->find($id);
        abort_unless($policy !== null, 404);

        $this->policies->delete($policy);
    }
}
