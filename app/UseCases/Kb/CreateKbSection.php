<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbSection;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use Illuminate\Validation\ValidationException;

final class CreateKbSection
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    /** @param array{category_id:string,name:string,slug:string} $data */
    public function handle(User $actor, array $data): KbSection
    {
        HelpdeskAccess::gate($actor);
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
