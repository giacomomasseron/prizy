<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Workspace;
use App\Services\DesignedEmail;
use App\Services\WorkspaceUrl;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

/**
 * Dispatched on workspace signup and on resend to let the user verify their email.
 * Generates a signed temporary URL pointing to the landlord verification route.
 */
class VerifyEmail extends Notification
{
    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $verifyUrl = URL::temporarySignedRoute(
            'verification.verify',
            // As long as a pending sign-up waits: its owner cannot log in to
            // ask for a fresh link until this one has activated the workspace.
            now()->addHours(Workspace::ACTIVATION_WINDOW_HOURS),
            [
                'id'   => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );

        $mail = (new MailMessage())->subject('Verify your email address');

        // The owner created the workspace, so they get the welcome. An invited
        // member gets the plain email: the welcome tells anyone who created no
        // workspace to ignore it, and they do have to verify.
        $workspace = Workspace::find($notifiable->workspace_id);
        if ($workspace !== null && $notifiable->admin_level === 'owner') {
            return $mail
                ->action('Verify my email', $verifyUrl)
                ->view(['emails.verify-email', 'emails.verify-email-text'], DesignedEmail::data(
                    $workspace,
                    WorkspaceUrl::host($workspace),
                    Workspace::ACTIVATION_WINDOW_HOURS,
                    [
                        ['title' => 'Connect your inbox', 'rest' => ' so support emails land in Prizy.'],
                        ['title' => 'Invite your team', 'rest' => ' — support and engineering, together.'],
                        ['title' => 'Escalate your first ticket', 'rest' => ' into an issue in one click.'],
                    ],
                ));
        }

        return $mail
            ->line('Welcome to Prizy! Please verify your email address to get started.')
            ->action('Verify Email', $verifyUrl)
            ->line('The link expires in '.Workspace::ACTIVATION_WINDOW_HOURS.' hours.');
    }
}
