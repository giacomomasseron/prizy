<?php

declare(strict_types=1);

namespace App\UseCases\Workspace;

use App\Models\User;
use App\Models\Workspace;
use App\Notifications\WorkspaceDeleted;
use App\Services\WorkspaceUrl;
use Illuminate\Support\Facades\DB;
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
 * One DELETE: every table cascades from workspaces, directly or through a
 * parent. The foreign keys with no ON DELETE rule are deferred for it, because
 * the cascade can reach a user before the rows that name them (see the
 * 2026_10_17 migration), then checked before the transaction ends, when
 * nothing is left to name anyone.
 *
 * Every owner is emailed after the response. Not a queued notification: queues
 * are tenant-aware, and the tenant is gone. A mail failure is only reported,
 * so it cannot turn a finished deletion into an error.
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

        DB::transaction(function () use ($workspace): void {
            DB::statement('SET CONSTRAINTS ALL DEFERRED');
            Workspace::withTrashed()->whereKey($workspace->id)->forceDelete();
            DB::statement('SET CONSTRAINTS ALL IMMEDIATE');
        });

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
