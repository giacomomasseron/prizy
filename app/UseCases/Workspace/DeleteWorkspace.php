<?php

declare(strict_types=1);

namespace App\UseCases\Workspace;

use App\Jobs\PurgeWorkspace;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\WorkspaceDeleted;
use App\Services\WorkspaceUrl;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Throwable;

use function Illuminate\Support\defer;

/**
 * Deletes the actor's workspace and everything in it, for good. Owner only
 * (WorkspacePolicy::delete), and only once the actor has typed the workspace's
 * name, the same check the confirmation dialog makes.
 *
 * The request only closes the workspace: soft-deleted, it is gone from
 * everything that finds a workspace (its hostnames, certificates, sign-in
 * links, the scheduled commands), so every member is out at once.
 * PurgeWorkspace then erases it on the queue. If that job cannot be queued, or
 * never succeeds, the hourly workspaces:purge-deleted queues it again; the
 * workspace stays closed meanwhile, so neither is the owner's error.
 *
 * Every owner is emailed after the response, not once the erasing is done: for
 * them the workspace is gone already, and the email is how they learn in time
 * that their account was used by someone else. Not a queued notification:
 * queues are tenant-aware, and the tenant is closed. A mail failure is only
 * reported, so it cannot turn a finished deletion into an error.
 */
final class DeleteWorkspace
{
    public function handle(User $actor, string $confirmation): void
    {
        /** @var Workspace $workspace */
        $workspace = Workspace::query()->findOrFail($actor->workspace_id);

        abort_unless(Gate::forUser($actor)->allows('delete', $workspace), 403);

        if ($confirmation !== $workspace->name) {
            throw ValidationException::withMessages([
                'confirm' => 'Type the workspace name exactly as shown to confirm.',
            ]);
        }

        $notice = new WorkspaceDeleted(
            workspaceName: $workspace->name,
            address: (string) parse_url(WorkspaceUrl::for($workspace), PHP_URL_HOST),
            deletedByName: $actor->name,
            deletedByEmail: $actor->email,
            deletedAt: now()->utc(),
        );
        $owners = User::query()
            ->where('workspace_id', $workspace->id)
            ->where('admin_level', 'owner')
            ->pluck('email')
            ->all();

        $workspace->delete();

        try {
            PurgeWorkspace::dispatch($workspace->id);
        } catch (Throwable $e) {
            report($e);
        }

        defer(function () use ($owners, $notice): void {
            foreach ($owners as $email) {
                try {
                    Notification::route('mail', $email)->notify($notice);
                } catch (Throwable $e) {
                    report($e);
                }
            }
        });
    }
}
