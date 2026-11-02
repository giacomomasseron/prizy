<?php

declare(strict_types=1);

namespace App\UseCases\Labels;

use App\Models\Label;
use App\Models\User;
use App\Repositories\LabelRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method Label run(User $actor, array $data)
 */
final class UpdateLabel extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly LabelRepository $labels) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): Label
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
