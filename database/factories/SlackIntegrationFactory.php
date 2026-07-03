<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\SlackIntegration;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<SlackIntegration> */
final class SlackIntegrationFactory extends Factory
{
    protected $model = SlackIntegration::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'webhook_url' => 'https://hooks.slack.com/services/T00000000/B00000000/' . Str::random(24),
            'events' => ['created', 'status_changed', 'assigned'],
            'is_active' => true,
        ];
    }
}
