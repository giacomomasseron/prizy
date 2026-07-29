<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\SlaPolicy;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

final class SlaPolicyRepository
{
    /** @return Collection<int, SlaPolicy> */
    public function forWorkspace(): Collection
    {
        return SlaPolicy::query()->with('schedule')->orderBy('name')->orderBy('id')->get();
    }

    public function find(string $id): ?SlaPolicy
    {
        return SlaPolicy::query()->with('schedule')->find($id);
    }

    /** @param array<string,mixed> $attrs */
    public function create(array $attrs): SlaPolicy
    {
        $attrs['id'] ??= (string) Str::uuid();
        $policy = SlaPolicy::create($attrs);

        return $policy->fresh('schedule');
    }

    /** @param array<string,mixed> $attrs */
    public function update(SlaPolicy $policy, array $attrs): SlaPolicy
    {
        $policy->update($attrs);

        return $policy->fresh('schedule');
    }

    public function delete(SlaPolicy $policy): void
    {
        $policy->delete();
    }
}
