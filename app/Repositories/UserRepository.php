<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\User;
use Illuminate\Support\Str;

final class UserRepository
{
    /**
     * Persist a new User with the given attributes.
     *
     * The current workspace must already be set via Workspace::makeCurrent() so that
     * the BelongsToWorkspace creating-hook can auto-fill workspace_id.
     *
     * A UUID is generated in PHP so the model's key is populated immediately after
     * create() — Eloquent does not fetch the Postgres-generated UUID back for
     * non-incrementing models.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): User
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }

        return User::create($attributes);
    }

    /**
     * Find a user by email within the currently active workspace.
     */
    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)->first();
    }
}
