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
 * @method SlaPolicy run(User $actor, string $id)
 */
final class FindSlaPolicy extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly SlaPolicyRepository $policies) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(User $actor, string $id): SlaPolicy
    {
        HelpdeskAccess::gate($actor);
        $policy = $this->policies->find($id);
        abort_unless($policy !== null, 404);

        return $policy;
    }
}
