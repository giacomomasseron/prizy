<?php

declare(strict_types=1);

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use RuntimeException;

final class WorkspaceScope implements Scope
{
    /**
     * The workspace_id for the currently active tenant.
     * Set by SetWorkspaceScopeTask; cleared at end of request.
     */
    private static ?string $currentWorkspaceId = null;

    // ------------------------------------------------------------------
    // Static helpers (called by Tasks)
    // ------------------------------------------------------------------

    public static function setCurrentWorkspaceId(string $workspaceId): void
    {
        self::$currentWorkspaceId = $workspaceId;
    }

    public static function clearCurrentWorkspaceId(): void
    {
        self::$currentWorkspaceId = null;
    }

    public static function getCurrentWorkspaceId(): string
    {
        if (self::$currentWorkspaceId === null) {
            throw new RuntimeException('No active tenant. WorkspaceScope has not been initialised.');
        }

        return self::$currentWorkspaceId;
    }

    public static function hasCurrentWorkspace(): bool
    {
        return self::$currentWorkspaceId !== null;
    }

    // ------------------------------------------------------------------
    // Eloquent Scope contract
    // ------------------------------------------------------------------

    public function apply(Builder $builder, Model $model): void
    {
        if (self::$currentWorkspaceId !== null) {
            $builder->where(
                $model->getTable() . '.workspace_id',
                self::$currentWorkspaceId
            );
        }
    }
}
