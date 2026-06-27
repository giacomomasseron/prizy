<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\UseCases\Members\InviteMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Handles workspace member management (currently: invite).
 *
 * Sits behind auth + verified + can:invite,App\Models\User middleware so only
 * verified owners and admins reach the handler.
 */
final class MemberController extends Controller
{
    public function __construct(
        private readonly InviteMember $inviteMember,
    ) {}

    /**
     * Send a workspace invitation to the given email with the specified role.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'        => ['required', 'email', 'max:255'],
            'admin_level'  => ['required', 'string', 'in:admin,member,viewer'],
            'is_developer' => ['boolean'],
            'is_agent'     => ['boolean'],
        ]);

        $invitation = $this->inviteMember->handle($request->user(), $data);

        return response()->json([
            'invitation' => $invitation->only([
                'id', 'email', 'admin_level', 'is_developer', 'is_agent', 'expires_at',
            ]),
        ], 201);
    }
}
