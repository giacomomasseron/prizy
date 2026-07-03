<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\GithubIntegration;
use Illuminate\Support\Str;

final class GithubIntegrationRepository
{
    public function forWorkspace(): ?GithubIntegration
    {
        return GithubIntegration::query()->first();
    }

    public function findByToken(string $token): ?GithubIntegration
    {
        return GithubIntegration::query()->where('webhook_token', $token)->first();
    }

    /** @param array<string, mixed> $attributes */
    public function upsert(array $attributes): GithubIntegration
    {
        $existing = GithubIntegration::query()->first();

        if ($existing !== null) {
            $existing->update($attributes);

            return $existing->refresh();
        }

        $attributes['id'] ??= (string) Str::uuid();
        $attributes['webhook_token'] ??= Str::random(40);

        return GithubIntegration::create($attributes)->refresh();
    }
}
