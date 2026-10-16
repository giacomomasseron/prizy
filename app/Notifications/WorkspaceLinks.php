<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * "Find your workspace": the login link of each workspace an address belongs to.
 */
final class WorkspaceLinks extends Notification
{
    /**
     * @param  list<array{name: string, url: string}>  $workspaces
     */
    public function __construct(
        public readonly array $workspaces,
    ) {}

    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $mail = (new MailMessage())
            ->subject('Your Prizy workspaces')
            ->line('This address has an account in these Prizy workspaces. Open one to log in:');

        foreach ($this->workspaces as $workspace) {
            $mail->line("{$workspace['name']}: {$workspace['url']}");
        }

        return $mail->line("If you didn't ask for this, you can ignore this email.");
    }
}
