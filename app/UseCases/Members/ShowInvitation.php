<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\User;
use App\Services\OpenInvitation;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * What the accept page shows the invitee: who is invited, to which workspace
 * and by whom. Holding the raw token proves they received the email.
 *
 * @method static array run(string $token)
 */
final class ShowInvitation extends BaseUseCase implements UseCaseInterface
{
    private readonly OpenInvitation $openInvitation;

    public function handle(mixed ...$arguments): mixed
    {
        $this->openInvitation = app(OpenInvitation::class);

        return $this->execute(...$arguments);
    }

    /**
     * @return array{email: string, workspace_name: string, inviter_name: string|null}
     *
     * @throws ValidationException when the invitation can't be used
     */
    private function execute(string $token): array
    {
        $invitation = $this->openInvitation->find($token);

        return [
            'email'          => $invitation->email,
            'workspace_name' => $invitation->workspace->name,
            // The inviter may have been removed since, which doesn't undo the invitation.
            'inviter_name'   => User::withTrashed()->whereKey($invitation->invited_by)->value('name'),
        ];
    }
}
