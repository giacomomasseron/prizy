<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\Workspace;
use App\Scopes\WorkspaceScope;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToWorkspace
{
    public static function bootBelongsToWorkspace(): void
    {
        static::addGlobalScope(new WorkspaceScope());

        static::creating(function ($model): void {
            if (empty($model->workspace_id)) {
                $model->workspace_id = WorkspaceScope::getCurrentWorkspaceId();
            }
        });
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }
}
