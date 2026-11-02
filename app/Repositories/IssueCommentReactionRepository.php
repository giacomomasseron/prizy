<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\IssueCommentReaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class IssueCommentReactionRepository
{
    /** Toggle: remove the (comment,user,emoji) row if it exists, else create it. */
    public function toggle(string $commentId, string $userId, string $emoji): void
    {
        DB::transaction(function () use ($commentId, $userId, $emoji): void {
            $existing = IssueCommentReaction::query()
                ->where('issue_comment_id', $commentId)
                ->where('user_id', $userId)
                ->where('emoji', $emoji)
                ->first();

            if ($existing !== null) {
                $existing->delete();

                return;
            }

            IssueCommentReaction::query()->insertOrIgnore([
                'id' => (string) Str::uuid(),
                'issue_comment_id' => $commentId,
                'user_id' => $userId,
                'emoji' => $emoji,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }
}
