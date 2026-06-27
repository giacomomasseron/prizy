<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\Workspace;
use App\Models\User;
use App\Repositories\InvitationRepository;
use App\Repositories\UserRepository;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Accepts a workspace invitation identified by the raw token.
 *
 * Runs in landlord context (no current tenant) — the invitee has not yet
 * joined a workspace. The token lookup bypasses WorkspaceScope so it works
 * across all workspaces under the permissive RLS policy (GUC unset → all
 * rows visible). After the invitation is validated, the target workspace is
 * made current only long enough to create the User (so the BelongsToWorkspace
 * creating-hook can auto-fill workspace_id), then immediately forgotten.
 */
final class AcceptInvite
{
    public function __construct(
        private readonly InvitationRepository $invitationRepository,
        private readonly UserRepository $userRepository,
    ) {}

    /**
     * @param  string  $token     The raw 40-char invite token from the email link.
     * @param  array<string, mixed>  $userData  Validated: name, password
     *
     * @throws ValidationException when the token is invalid, expired, or already used
     */
    public function handle(string $token, array $userData): User
    {
        $tokenHash  = hash('sha256', $token);
        $invitation = $this->invitationRepository->findByTokenHash($tokenHash);

        if ($invitation === null) {
            throw ValidationException::withMessages([
                'token' => ['The invitation token is invalid.'],
            ]);
        }

        if ($invitation->accepted_at !== null) {
            throw ValidationException::withMessages([
                'token' => ['This invitation has already been accepted.'],
            ]);
        }

        if ($invitation->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'token' => ['This invitation has expired.'],
            ]);
        }

        // Make the invitation's workspace current so the BelongsToWorkspace
        // creating-hook auto-fills workspace_id on the new User.
        $workspace = Workspace::find($invitation->workspace_id);
        $workspace->makeCurrent();

        try {
            $user = $this->userRepository->create([
                'name'          => $userData['name'],
                'email'         => $invitation->email,
                'password_hash' => Hash::make($userData['password']),
                'admin_level'   => $invitation->admin_level,
                'is_developer'  => $invitation->is_developer,
                'is_agent'      => $invitation->is_agent,
            ]);
        } finally {
            // Always restore the no-tenant context regardless of success/failure.
            Workspace::forgetCurrent();
        }

        // Mark the invitation consumed — update by primary key, scope-safe.
        $invitation->update(['accepted_at' => now()]);

        // Send a verification email (the new user is unverified).
        $user->sendEmailVerificationNotification();

        // Log the new member in immediately.
        Auth::login($user);

        return $user;
    }
}
