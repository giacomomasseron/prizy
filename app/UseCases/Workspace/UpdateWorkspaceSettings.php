<?php

declare(strict_types=1);

namespace App\UseCases\Workspace;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Facades\Gate;

/**
 * Workspace-level configuration.
 *
 * The permission rule already exists as WorkspacePolicy::updateSettings (admin
 * or owner, same workspace) and is pinned by RbacMatrixTest — so this asks the
 * policy rather than restating it, and tightening the policy tightens this
 * endpoint too. Asked here rather than in the controller because reaching the
 * Workspace entity from a controller is a deptrac violation (Controller:
 * [UseCase]).
 *
 * Always acts on the actor's own workspace — there is no workspace id in the
 * request to get wrong.
 */
final class UpdateWorkspaceSettings
{
    /** @param array{helpdesk_enabled?: bool} $data Validated input */
    public function handle(User $actor, array $data): Workspace
    {
        /** @var Workspace $workspace */
        $workspace = Workspace::query()->findOrFail($actor->workspace_id);

        abort_unless(Gate::forUser($actor)->allows('updateSettings', $workspace), 403);

        $workspace->fill($data);
        $workspace->save();

        return $workspace;
    }
}
