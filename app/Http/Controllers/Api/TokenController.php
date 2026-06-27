<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use App\UseCases\Tokens\RevokeToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Manages personal access tokens for the authenticated user.
 *
 * All routes here are guarded by the SESSION (web) guard — the user must be
 * logged in via a browser session to create or revoke their API tokens.
 * The plaintext token is returned ONLY on creation; subsequent GET requests
 * never include it (token_hash is hidden on the PersonalAccessToken model).
 */
final class TokenController extends Controller
{
    public function __construct(
        private readonly CreatePersonalAccessToken $createToken,
        private readonly RevokeToken $revokeToken,
    ) {}

    /**
     * Create a new personal access token.
     *
     * Returns the plaintext token exactly once inside `token`.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

        $result = $this->createToken->handle(
            $request->user(),
            $data['name'],
            isset($data['expires_at']) ? now()->parse($data['expires_at']) : null,
        );

        return response()->json([
            'token' => $result['token'],
            'id'    => $result['model']->id,
            'name'  => $result['model']->name,
        ], 201);
    }

    /**
     * List the current user's tokens (no plaintext ever returned).
     */
    public function index(Request $request): JsonResponse
    {
        $tokens = $request->user()
            ->personalAccessTokens()
            ->orderBy('created_at', 'desc')
            ->get()
            ->toArray();

        return response()->json($tokens);
    }

    /**
     * Revoke (delete) a token by id.
     *
     * Only the owning user may revoke their own tokens.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->revokeToken->handle($request->user(), $id);

        return response()->json(['message' => 'Token revoked.']);
    }
}
