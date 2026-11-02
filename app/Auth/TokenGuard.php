<?php

declare(strict_types=1);

namespace App\Auth;

use App\Models\User;
use App\Repositories\PersonalAccessTokenRepository;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Http\Request;

/**
 * Custom Bearer-token guard over the personal_access_tokens table.
 *
 * ## Per-workspace enforcement (scoped-find approach)
 *
 * After validating the token row, the guard loads the owner via
 *   User::find($token->user_id)
 * The User model carries the BelongsToWorkspace trait, which adds a global
 * WorkspaceScope that filters WHERE workspace_id = <current workspace id>.
 * NeedsTenant has already run before the guard, so the current workspace is
 * always set on entry. If the token was issued for workspace A but the request
 * hits workspace B's host, WorkspaceScope filters workspace A's user out and
 * User::find returns null → the guard returns null → 401.
 *
 * This approach produces 401 (not 403) for cross-workspace attempts; the spec
 * allows either status code ("401/403").
 */
final class TokenGuard implements Guard
{
    private ?Authenticatable $user = null;

    /** Hash of the token that was used to populate $user (for cache invalidation). */
    private ?string $authenticatedTokenHash = null;

    public function __construct(
        private readonly PersonalAccessTokenRepository $repository,
        private readonly Request $request,
    ) {}

    // ------------------------------------------------------------------
    // Guard contract
    // ------------------------------------------------------------------

    public function check(): bool
    {
        return $this->user() !== null;
    }

    public function guest(): bool
    {
        return ! $this->check();
    }

    public function user(): ?Authenticatable
    {
        // Always read the bearer token from the current request bound in the
        // IoC container (app('request')). The injected $this->request is the
        // request at guard-construction time; in long-running processes (and
        // in the test environment where the same process handles multiple
        // requests) this can be a stale object. The kernel calls
        // app()->instance('request', $newRequest) on each dispatch, so
        // app('request') always reflects the current request.
        $plain = app('request')->bearerToken();

        // If the token matches what we already authenticated, return cached user.
        if ($this->user !== null
            && $plain !== null
            && $this->authenticatedTokenHash === hash('sha256', $plain)) {
            return $this->user;
        }

        // Token changed or not yet resolved — reset cached state.
        $this->user = null;
        $this->authenticatedTokenHash = null;

        if ($plain === null) {
            return null;
        }

        $hash  = hash('sha256', $plain);
        $token = $this->repository->findByTokenHash($hash);

        if ($token === null) {
            return null;
        }

        // Reject expired tokens
        if ($token->expires_at !== null && $token->expires_at->isPast()) {
            return null;
        }

        // Load the user through the workspace-scoped query.
        // WorkspaceScope::apply() adds WHERE workspace_id = <currentWorkspaceId>.
        // If the token's user belongs to a different workspace the query returns
        // null → guard returns null → 401.
        $user = User::find($token->user_id);

        if ($user === null) {
            return null;
        }

        // Record the successful use
        $token->update(['last_used_at' => now()]);

        $this->user = $user;
        $this->authenticatedTokenHash = $hash;

        return $this->user;
    }

    public function id(): mixed
    {
        return $this->user()?->getAuthIdentifier();
    }

    /**
     * Credentials-based validation is not used by the Bearer guard.
     *
     * @param  array<string, mixed>  $credentials
     */
    public function validate(array $credentials = []): bool
    {
        return false;
    }

    public function hasUser(): bool
    {
        return $this->user !== null;
    }

    public function setUser(Authenticatable $user): static
    {
        $this->user = $user;

        return $this;
    }
}
