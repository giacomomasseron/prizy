<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\SlackIntegration;
use Illuminate\Support\Str;

final class SlackIntegrationRepository
{
    public function forWorkspace(): ?SlackIntegration
    {
        return SlackIntegration::query()->first();
    }

    public function deleteForWorkspace(): void
    {
        SlackIntegration::query()->delete();
    }

    /** @param array<string, mixed> $attributes */
    public function upsert(array $attributes): SlackIntegration
    {
        $existing = SlackIntegration::query()->first();

        if ($existing !== null) {
            $existing->update($attributes);

            return $existing->refresh();
        }

        $attributes['id'] ??= (string) Str::uuid();
        $model = SlackIntegration::create($attributes);

        return $model->refresh();
    }
}
