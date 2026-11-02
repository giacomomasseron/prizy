<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Invitation;
use App\Models\Workspace;
use App\Services\DesignedEmail;
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
        private readonly string $inviterName,
        private readonly Workspace $workspace,
        private readonly Invitation $invitation,
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
        // The card names the host the link goes to. That is the one the
        // invitation was sent from, which can be a custom domain, and it's
        // known to work: someone was just on it.
        $host = (string) parse_url($this->acceptUrl, PHP_URL_HOST);

        return (new MailMessage())
            ->subject('You have been invited to join a workspace on Prizy')
            ->action('Accept invitation', $this->acceptUrl)
            ->view(['emails.invitation', 'emails.invitation-text'], [
                ...DesignedEmail::data($this->workspace, $host, Invitation::EXPIRES_IN_HOURS, $this->steps()),
                'inviterName' => DesignedEmail::singleLine($this->inviterName),
                'pitch'       => $this->pitch(),
            ]);
    }

    /** What this workspace is for. It always has at least one module on. */
    private function pitch(): string
    {
        return match (true) {
            ! $this->workspace->helpdesk_enabled => 'where your team tracks its engineering issues.',
            ! $this->workspace->tracker_enabled  => 'where your team answers its support tickets.',
            default                              => 'where support tickets and engineering issues live side by side.',
        };
    }

    /**
     * Only what this invitee will be able to do: their module needs its
     * workspace switch on, and only tracker users have Today, to-dos and @
     * mentions. An invitation never makes an owner, so the owner's bypass of
     * the capability flags doesn't come into it.
     *
     * @return list<array{title: string, rest: string}>
     */
    private function steps(): array
    {
        $steps = [['title' => 'Set your name and password', 'rest' => ' — takes a minute.']];

        if ($this->invitation->admin_level === 'viewer') {
            $steps[] = ['title' => 'Have a look around', 'rest' => ' — your access is read-only.'];

            return $steps;
        }

        $tracker = $this->invitation->is_developer && $this->workspace->tracker_enabled;
        $desk = $this->invitation->is_agent && $this->workspace->helpdesk_enabled;

        if ($tracker && $desk) {
            $steps[] = ['title' => 'Check Today', 'rest' => ' for your issues, and Support for your tickets.'];
        } elseif ($tracker) {
            $steps[] = ['title' => 'Check Today', 'rest' => ' for the issues assigned to you.'];
        } elseif ($desk) {
            $steps[] = ['title' => 'Open Support', 'rest' => ' for the tickets assigned to you.'];
        } elseif ($this->invitation->admin_level === 'admin') {
            $steps[] = ['title' => 'Open Settings', 'rest' => ' to look after the workspace.'];
        }

        if ($tracker) {
            $steps[] = ['title' => 'Mention teammates', 'rest' => ' with @, and link issues with # in your to-dos.'];
        }

        return $steps;
    }
}
