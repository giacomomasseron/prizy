<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\Invitation;
use App\Models\User;
use App\Notifications\WorkspaceInvitation;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Creates a pending workspace invitation and emails the invitee.
 *
 * Enforces the roles.md two-axis constraint: a member with NEITHER
 * is_developer NOR is_agent has no meaningful access and must not be
 * invited. (Owners, admins, and viewers are exempt from the capability
 * requirement — they derive access from admin_level alone.)
 *
 * @method static Invitation run(User $inviter, array $data)
 */
final class InviteMember extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /**
     * @param  array<string, mixed>  $data  Validated input: email, admin_level, is_developer, is_agent
     *
     * @throws ValidationException when the roles.md "no empty member" rule is violated, or they are already a member
     */
    private function execute(User $inviter, array $data): Invitation
    {
        $adminLevel   = (string) $data['admin_level'];
        $isDeveloper  = (bool) ($data['is_developer'] ?? false);
        $isAgent      = (bool) ($data['is_agent'] ?? false);

        // roles.md: ownership cannot be assigned via invitation (exactly one owner per workspace)
        if ($adminLevel === 'owner') {
            throw ValidationException::withMessages([
                'admin_level' => ['Ownership cannot be assigned via invitation.'],
            ]);
        }

        // roles.md: a member with no capability and not a viewer is invalid
        if ($adminLevel === 'member' && ! $isDeveloper && ! $isAgent) {
            throw ValidationException::withMessages([
                'role' => [
                    'A member must have at least one capability (is_developer or is_agent). '
                    . 'Use "viewer" for read-only access.',
                ],
            ]);
        }

        // Someone already here has nothing to accept. A removed member isn't
        // here any more (the default scope leaves them out), so they can be
        // invited back: AcceptInvite restores them.
        $isMember = User::where('workspace_id', $inviter->workspace_id)
            ->where('email', $data['email'])
            ->exists();

        if ($isMember) {
            throw ValidationException::withMessages([
                'email' => ['This person is already a member of this workspace.'],
            ]);
        }

        $rawToken  = Str::random(40);
        $tokenHash = hash('sha256', $rawToken);

        // Spec §5: "Re-invite before expiry updates the existing pending row."
        // If a pending (not yet accepted) invitation exists for this email in
        // the current workspace, update it in place rather than inserting a
        // duplicate (which would violate the idx_invitations_pending partial
        // unique index and return a 500).
        $existingInvitation = Invitation::whereNull('accepted_at')
            ->where('email', $data['email'])
            ->first();

        if ($existingInvitation !== null) {
            $existingInvitation->update([
                'admin_level'  => $adminLevel,
                'is_developer' => $isDeveloper,
                'is_agent'     => $isAgent,
                'token_hash'   => $tokenHash,
                'invited_by'   => $inviter->id,
                'expires_at'   => now()->addHours(Invitation::EXPIRES_IN_HOURS),
            ]);
            $invitation = $existingInvitation;
        } else {
            // Inject the UUID in PHP — never rely on Eloquent reading it back
            // from the Postgres DEFAULT gen_random_uuid().
            $invitation = Invitation::forceCreate([
                'id'           => (string) Str::uuid(),
                'email'        => $data['email'],
                'admin_level'  => $adminLevel,
                'is_developer' => $isDeveloper,
                'is_agent'     => $isAgent,
                'token_hash'   => $tokenHash,
                'invited_by'   => $inviter->id,
                'expires_at'   => now()->addHours(Invitation::EXPIRES_IN_HOURS),
            ]);
        }

        // The raw token goes ONLY in the email; the hash is stored in the DB.
        $acceptUrl = url("/invitations/{$rawToken}/accept");

        // On-demand notification to the invitee's email — they are not a User yet.
        Notification::route('mail', $data['email'])->notify(new WorkspaceInvitation($acceptUrl, $inviter->name, $inviter->workspace, $invitation));

        return $invitation;
    }
}
