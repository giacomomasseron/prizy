<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbSection;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static KbSection run(User $actor, array $data)
 */
final class CreateKbSection extends BaseUseCase implements UseCaseInterface
{
    private readonly KbAuthoringRepository $kb;

    public function handle(mixed ...$arguments): mixed
    {
        $this->kb = app(KbAuthoringRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array{category_id:string,name:string,slug:string} $data */
    private function execute(User $actor, array $data): KbSection
    {
        HelpdeskAccess::gateWrite($actor);
        $category = $this->kb->findCategory($data['category_id']);
        if ($category === null) {
            throw ValidationException::withMessages(['category_id' => ['Unknown category.']]);
        }
        if ($this->kb->sectionSlugTaken($category->id, $data['slug'])) {
            throw ValidationException::withMessages(['slug' => ['Already used by another section.']]);
        }

        return $this->kb->createSection($category, ['name' => $data['name'], 'slug' => $data['slug']]);
    }
}
