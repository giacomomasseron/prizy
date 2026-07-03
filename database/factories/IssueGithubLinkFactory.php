<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\IssueGithubLink;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<IssueGithubLink> */
final class IssueGithubLinkFactory extends Factory
{
    protected $model = IssueGithubLink::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $number = $this->faker->numberBetween(1, 9999);

        return [
            'id' => Str::uuid()->toString(),
            'repo' => 'acme/app',
            'number' => $number,
            'url' => "https://github.com/acme/app/pull/{$number}",
            'title' => null,
            'state' => 'open',
            'source' => 'manual',
            'created_by' => User::factory(),
        ];
    }
}
