<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

final class InvitationFactory extends Factory
{
    protected $model = Invitation::class;

    public function definition(): array
    {
        return [
            'id'           => Str::uuid()->toString(),
            'email'        => $this->faker->unique()->safeEmail(),
            'admin_level'  => 'member',
            'is_developer' => false,
            'is_agent'     => false,
            'token_hash'   => hash('sha256', Str::random(40)),
            'invited_by'   => User::factory(),
            'expires_at'   => now()->addDays(3),
            'accepted_at'  => null,
        ];
    }
}
