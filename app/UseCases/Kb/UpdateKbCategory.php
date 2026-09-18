<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbCategory;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use Illuminate\Validation\ValidationException;

final class UpdateKbCategory
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    /** @param array<string,mixed> $data */
    public function handle(User $actor, string $id, array $data): KbCategory
    {
        HelpdeskAccess::gate($actor);
        $category = $this->kb->findCategory($id);
        abort_unless($category !== null, 404);
        if ($this->kb->categorySlugTaken($data['slug'], $category->id)) {
            throw ValidationException::withMessages(['slug' => ['Already used by another category.']]);
        }

        return $this->kb->updateCategory($category, $data);
    }
}
