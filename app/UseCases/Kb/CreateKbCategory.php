<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbCategory;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static KbCategory run(User $actor, array $data)
 */
final class CreateKbCategory extends BaseUseCase implements UseCaseInterface
{
    private readonly KbAuthoringRepository $kb;

    public function handle(mixed ...$arguments): mixed
    {
        $this->kb = app(KbAuthoringRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array{name:string,slug:string,icon:string,color:string,description:?string} $data */
    private function execute(User $actor, array $data): KbCategory
    {
        HelpdeskAccess::gateWrite($actor);
        if ($this->kb->categorySlugTaken($data['slug'])) {
            throw ValidationException::withMessages(['slug' => ['Already used by another category.']]);
        }

        return $this->kb->createCategory($data);
    }
}
