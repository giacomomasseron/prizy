<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\User;
use App\Models\Workspace;
use App\Notifications\WorkspaceLinks;
use App\Services\WorkspaceUrl;
use Illuminate\Support\Facades\Notification;

/**
 * Emails an address the login link of every live workspace it has an account
 * in. Runs on the sign-up host, where no workspace is current, so WorkspaceScope
 * adds nothing and RLS is permissive: the lookup spans every workspace. An
 * address with none gets nothing (the caller answers the same either way).
 */
final class SendWorkspaceLinks
{
    public function handle(string $email): void
    {
        // users.email is CITEXT, so this matches whatever case was typed.
        $workspaces = Workspace::query()
            ->activated()
            ->whereIn('id', User::query()->where('email', $email)->select('workspace_id'))
            ->orderBy('name')
            ->get();

        if ($workspaces->isEmpty()) {
            return;
        }

        Notification::route('mail', $email)->notify(new WorkspaceLinks(
            $workspaces->map(fn (Workspace $workspace): array => [
                'name' => $workspace->name,
                'url'  => WorkspaceUrl::for($workspace).'/login',
            ])->values()->all(),
        ));
    }
}
