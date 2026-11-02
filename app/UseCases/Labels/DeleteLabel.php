<?php

declare(strict_types=1);

namespace App\UseCases\Labels;

use App\Models\User;
use App\Repositories\LabelRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static void run(User $actor, array $data)
 */
final class DeleteLabel extends BaseUseCase implements UseCaseInterface
{
    private readonly LabelRepository $labels;

    public function handle(mixed ...$arguments): mixed
    {
        $this->labels = app(LabelRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): void
    {
        $label = $this->labels->findInWorkspace((string) $data['label_id']);
        if ($label === null) {
            throw ValidationException::withMessages(['label_id' => ['The selected label is invalid.']]);
        }
        $this->labels->delete($label);
    }
}
