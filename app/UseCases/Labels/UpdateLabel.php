<?php

declare(strict_types=1);

namespace App\UseCases\Labels;

use App\Models\Label;
use App\Models\User;
use App\Repositories\LabelRepository;
use Illuminate\Validation\ValidationException;

final class UpdateLabel
{
    public function __construct(private readonly LabelRepository $labels) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Label
    {
        $label = $this->labels->findInWorkspace((string) $data['label_id']);
        if ($label === null) {
            throw ValidationException::withMessages(['label_id' => ['The selected label is invalid.']]);
        }

        $attrs = array_intersect_key($data, array_flip(['name', 'color', 'group']));
        if (array_key_exists('group', $attrs)) {
            $g = trim((string) $attrs['group']);
            $attrs['group'] = $g === '' ? null : $g;
        }
        return $this->labels->update($label, $attrs);
    }
}
