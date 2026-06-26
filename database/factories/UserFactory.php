<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

final class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'id'    => Str::uuid()->toString(),
            'name'  => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
        ];
    }
}
