<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\KbCategory;
use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;
use Illuminate\Validation\ValidationException;

final class CreateKbCategory
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    /** @param array{name:string,slug:string,icon:string,color:string,description:?string} $data */
    public function handle(User $actor, array $data): KbCategory
    {
        HelpdeskAccess::gate($actor);
        if ($this->kb->categorySlugTaken($data['slug'])) {
            throw ValidationException::withMessages(['slug' => ['Already used by another category.']]);
        }

        return $this->kb->createCategory($data);
    }
}
