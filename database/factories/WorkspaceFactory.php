<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

final class WorkspaceFactory extends Factory
{
    protected $model = Workspace::class;

    public function definition(): array
    {
        return [
            'id'   => Str::uuid()->toString(),
            'name' => $this->faker->company(),
            'slug' => Str::slug($this->faker->unique()->company()),
        ];
    }
}
