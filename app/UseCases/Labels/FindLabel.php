<?php

declare(strict_types=1);

namespace App\UseCases\Labels;

use App\Models\Label;
use App\Repositories\LabelRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class FindLabel
{
    public function __construct(private readonly LabelRepository $labels) {}

    public function handle(string $id): Label
    {
        $label = $this->labels->findInWorkspace($id);
        if ($label === null) {
            throw (new ModelNotFoundException())->setModel(Label::class, [$id]);
        }

        return $label;
    }
}
