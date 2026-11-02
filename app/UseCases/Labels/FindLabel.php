<?php

declare(strict_types=1);

namespace App\UseCases\Labels;

use App\Models\Label;
use App\Repositories\LabelRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @method static Label run(string $id)
 */
final class FindLabel extends BaseUseCase implements UseCaseInterface
{
    private readonly LabelRepository $labels;

    public function handle(mixed ...$arguments): mixed
    {
        $this->labels = app(LabelRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(string $id): Label
    {
        $label = $this->labels->findInWorkspace($id);
        if ($label === null) {
            throw (new ModelNotFoundException())->setModel(Label::class, [$id]);
        }

        return $label;
    }
}
