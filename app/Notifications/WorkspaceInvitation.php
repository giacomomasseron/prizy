<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to a prospective workspace member when an admin/owner invites them.
 * Delivered to the invitee's email via on-demand notification (they are not
 * a User yet). The accept URL carries the RAW token — never the hash.
 */
class WorkspaceInvitation extends Notification
{
    public function __construct(
        private readonly string $acceptUrl,
    ) {}

    /**
     * Expose the accept URL so tests can capture and verify the token.
     */
    public function getAcceptUrl(): string
    {
        return $this->acceptUrl;
    }

    /**
     * @return list<string>
     */
    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject('You have been invited to join a workspace on Prizy')
            ->line('You have been invited to join a workspace on Prizy.')
            ->action('Accept Invitation', $this->acceptUrl)
            ->line('This invitation expires in 72 hours. If you were not expecting this invitation, no action is required.');
    }
}
