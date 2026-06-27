<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\Invitation;
use App\Models\User;
use App\Notifications\WorkspaceInvitation;
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
 */
final class InviteMember
{
    /**
     * @param  array<string, mixed>  $data  Validated input: email, admin_level, is_developer, is_agent
     *
     * @throws ValidationException when the roles.md "no empty member" rule is violated
     */
    public function handle(User $inviter, array $data): Invitation
    {
        $adminLevel   = (string) $data['admin_level'];
        $isDeveloper  = (bool) ($data['is_developer'] ?? false);
        $isAgent      = (bool) ($data['is_agent'] ?? false);

        // roles.md: a member with no capability and not a viewer is invalid
        if ($adminLevel === 'member' && ! $isDeveloper && ! $isAgent) {
            throw ValidationException::withMessages([
                'role' => [
                    'A member must have at least one capability (is_developer or is_agent). '
                    . 'Use "viewer" for read-only access.',
                ],
            ]);
        }

        $rawToken  = Str::random(40);
        $tokenHash = hash('sha256', $rawToken);

        // Inject the UUID in PHP — never rely on Eloquent reading it back
        // from the Postgres DEFAULT gen_random_uuid().
        $invitation = Invitation::forceCreate([
            'id'          => (string) Str::uuid(),
            'email'       => $data['email'],
            'admin_level' => $adminLevel,
            'is_developer' => $isDeveloper,
            'is_agent'    => $isAgent,
            'token_hash'  => $tokenHash,
            'invited_by'  => $inviter->id,
            'expires_at'  => now()->addHours(72),
        ]);

        // The raw token goes ONLY in the email; the hash is stored in the DB.
        $acceptUrl = url("/invitations/{$rawToken}/accept");

        // On-demand notification to the invitee's email — they are not a User yet.
        Notification::route('mail', $data['email'])->notify(new WorkspaceInvitation($acceptUrl));

        return $invitation;
    }
}
