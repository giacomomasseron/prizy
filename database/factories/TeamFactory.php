<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

final class TeamFactory extends Factory
{
    protected $model = Team::class;

    public function definition(): array
    {
        return [
            'id'         => Str::uuid()->toString(),
            'name'       => $this->faker->company(),
            'identifier' => strtoupper($this->faker->unique()->lexify('???')),
        ];
    }
}
