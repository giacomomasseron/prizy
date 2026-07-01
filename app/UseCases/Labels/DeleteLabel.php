<?php

declare(strict_types=1);

namespace App\UseCases\Labels;

use App\Models\User;
use App\Repositories\LabelRepository;
use Illuminate\Validation\ValidationException;

final class DeleteLabel
{
    public function __construct(private readonly LabelRepository $labels) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): void
    {
        $label = $this->labels->findInWorkspace((string) $data['label_id']);
        if ($label === null) {
            throw ValidationException::withMessages(['label_id' => ['The selected label is invalid.']]);
        }
        $this->labels->delete($label);
    }
}
