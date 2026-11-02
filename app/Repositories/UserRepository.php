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

    /**
     * A member removed from the currently active workspace, by email. Their
     * soft-deleted row still holds the unique (workspace_id, email) key.
     */
    public function findRemovedByEmail(string $email): ?User
    {
        return User::onlyTrashed()->where('email', $email)->first();
    }

    /**
     * Bring a removed member back with the given attributes.
     *
     * Their API tokens stay dead: those were issued before they were removed,
     * and restoring the row would otherwise bring them back to life.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function restore(User $user, array $attributes): User
    {
        $user->personalAccessTokens()->delete();
        $user->fill($attributes)->restore();

        return $user;
    }

    /** The user's daily focus capacity on Today, in minutes. */
    public function setDailyFocusMinutes(User $user, int $minutes): User
    {
        $user->daily_focus_minutes = $minutes;
        $user->save();

        return $user;
    }
}
