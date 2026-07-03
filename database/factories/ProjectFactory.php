<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

final class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        return [
            'id'         => Str::uuid()->toString(),
            'name'       => $this->faker->words(3, true),
            'created_by' => User::factory(),
        ];
    }
}
