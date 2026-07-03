<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\GithubIntegration;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<GithubIntegration> */
final class GithubIntegrationFactory extends Factory
{
    protected $model = GithubIntegration::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'webhook_token' => Str::random(40),
            'webhook_secret' => 'shhh-secret',
            'move_to_done_on_merge' => true,
            'is_active' => true,
        ];
    }
}
