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
        if ($this->user !== null) {
            return $this->user;
        }

        $plain = $this->request->bearerToken();

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
