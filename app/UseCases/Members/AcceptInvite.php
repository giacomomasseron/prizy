<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\User;
use App\Models\Workspace;
use App\Repositories\UserRepository;
use App\Services\OpenInvitation;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Accepts a workspace invitation identified by the raw token.
 *
 * Runs in landlord context (no current tenant) — the invitee has not yet
 * joined a workspace. After the invitation is validated, the target workspace
 * is made current only long enough to create the User (so the BelongsToWorkspace
 * creating-hook can auto-fill workspace_id), then immediately forgotten.
 *
 * Someone removed earlier comes back as the same person: their row is still
 * there, soft-deleted, holding the workspace's unique email, and restoring it
 * reconnects what they wrote. Name, password and role come from this invitation.
 *
 * @method User run(string $token, array $userData)
 */
final class AcceptInvite extends BaseUseCase implements UseCaseInterface
{
    public function __construct(
        private readonly OpenInvitation $openInvitation,
        private readonly UserRepository $userRepository,
    ) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /**
     * @param  string  $token     The raw 40-char invite token from the email link.
     * @param  array<string, mixed>  $userData  Validated: name, password
     *
     * @throws ValidationException when the invitation can't be used
     */
    private function execute(string $token, array $userData): User
    {
        // Wrap the lookup → user-create → mark-accepted steps in a transaction
        // so a concurrent double-accept cannot both pass the accepted_at === null
        // guard (Postgres will serialise the UPDATE; the second will see a
        // non-null accepted_at and the outer check will fail on re-read).
        $user = DB::transaction(function () use ($token, $userData): User {
            $invitation = $this->openInvitation->find($token);

            // Make the invitation's workspace current so the BelongsToWorkspace
            // creating-hook auto-fills workspace_id on the new User.
            $invitation->workspace->makeCurrent();

            try {
                $attributes = [
                    'name'          => $userData['name'],
                    'password_hash' => Hash::make($userData['password']),
                    'admin_level'   => $invitation->admin_level,
                    'is_developer'  => $invitation->is_developer,
                    'is_agent'      => $invitation->is_agent,
                ];

                $removed = $this->userRepository->findRemovedByEmail($invitation->email);

                $user = $removed !== null
                    ? $this->userRepository->restore($removed, $attributes)
                    : $this->userRepository->create([...$attributes, 'email' => $invitation->email]);
            } finally {
                // Always restore the no-tenant context regardless of success/failure.
                Workspace::forgetCurrent();
            }

            // Mark the invitation consumed — update by primary key, scope-safe.
            $invitation->update(['accepted_at' => now()]);

            return $user;
        });

        // Send a verification email to a new user (someone returning may have
        // confirmed this address already).
        // Done outside the transaction so a mail-dispatch failure doesn't
        // roll back the already-created user row.
        if (! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        // Log the new member in immediately.
        Auth::login($user);

        return $user;
    }
}
