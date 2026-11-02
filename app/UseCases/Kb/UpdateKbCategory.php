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
 * @method KbCategory run(User $actor, string $id, array $data)
 */
final class UpdateKbCategory extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param array<string,mixed> $data */
    private function execute(User $actor, string $id, array $data): KbCategory
    {
        HelpdeskAccess::gateWrite($actor);
        $category = $this->kb->findCategory($id);
        abort_unless($category !== null, 404);
        if ($this->kb->categorySlugTaken($data['slug'], $category->id)) {
            throw ValidationException::withMessages(['slug' => ['Already used by another category.']]);
        }

        return $this->kb->updateCategory($category, $data);
    }
}
