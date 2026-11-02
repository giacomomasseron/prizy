<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

final class IssueFactory extends Factory
{
    protected $model = Issue::class;

    public function definition(): array
    {
        return [
            'id'         => Str::uuid()->toString(),
            'title'      => $this->faker->sentence(),
            'team_id'    => Team::factory(),
            'created_by' => User::factory(),
        ];
    }

    public function status(string $status): static
    {
        return $this->state(fn (): array => ['status' => $status]);
    }
}
