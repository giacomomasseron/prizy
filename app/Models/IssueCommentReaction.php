<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $issue_comment_id
 * @property string $user_id
 * @property string $emoji
 */
#[Table(name: 'issue_comment_reactions', key: 'id', keyType: 'string', incrementing: false, timestamps: true)]
#[Connection('pgsql')]
#[Fillable(['id', 'issue_comment_id', 'user_id', 'emoji'])]
class IssueCommentReaction extends Model
{
    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'issue_comment_id' => 'string',
            'user_id' => 'string',
            'emoji' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<IssueComment, $this> */
    public function comment(): BelongsTo
    {
        return $this->belongsTo(IssueComment::class, 'issue_comment_id');
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
