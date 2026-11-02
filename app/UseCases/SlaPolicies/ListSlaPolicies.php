<?php

declare(strict_types=1);

namespace App\UseCases\SlaPolicies;

use App\Models\SlaPolicy;
use App\Models\User;
use App\Repositories\SlaPolicyRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method Collection run(User $actor)
 */
final class ListSlaPolicies extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly SlaPolicyRepository $policies) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return Collection<int, SlaPolicy> */
    private function execute(User $actor): Collection
    {
        HelpdeskAccess::gate($actor);

        return $this->policies->forWorkspace();
    }
}
