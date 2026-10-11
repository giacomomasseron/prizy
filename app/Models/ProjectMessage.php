<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * A message in a project's chat (PRD §3.2.11). Its author may edit it (edited_at) and delete it (a soft delete:
 * hidden from the chat, the count and the export). It links the issues picked while writing it.
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $project_id
 * @property string $user_id
 * @property string $body
 * @property Carbon|null $edited_at
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Collection<int, Issue> $issues
 */
#[Table(name: 'project_messages', key: 'id', keyType: 'string', incrementing: false, timestamps: true)]
#[Connection('pgsql')]
#[Fillable(['project_id', 'user_id', 'body', 'edited_at'])]
final class ProjectMessage extends TenantAwareEntity
{
    use SoftDeletes;

    protected static function booted(): void
    {
        static::creating(function (self $message): void {
            if (empty($message->id)) {
                $message->id = (string) Str::uuid();
            }
        });
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'workspace_id' => 'string',
            'project_id' => 'string',
            'user_id' => 'string',
            'body' => 'string',
            'edited_at' => 'datetime',
            'deleted_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    /** The linked issues; a deleted (soft-deleted) issue drops out, so its reference reads as plain text. */
    public function issues(): BelongsToMany
    {
        return $this->belongsToMany(Issue::class, 'project_message_issues', 'message_id', 'issue_id');
    }
}
