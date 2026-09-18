<?php

declare(strict_types=1);

namespace App\UseCases\Kb;

use App\Models\User;
use App\Repositories\KbAuthoringRepository;
use App\Services\HelpdeskAccess;

final class DeleteKbCategory
{
    public function __construct(private readonly KbAuthoringRepository $kb) {}

    public function handle(User $actor, string $id): void
    {
        HelpdeskAccess::gate($actor);
        $category = $this->kb->findCategory($id);
        abort_unless($category !== null, 404);
        $this->kb->deleteCategory($category);
    }
}
