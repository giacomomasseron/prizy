<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\User;
use App\Repositories\IssueCommentReactionRepository;
use App\Repositories\IssueCommentRepository;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class ToggleIssueCommentReaction
{
    public function __construct(
        private readonly IssueCommentRepository $comments,
        private readonly IssueCommentReactionRepository $reactions,
    ) {}

    public function handle(User $actor, Issue $issue, string $commentId, string $emoji): IssueComment
    {
        $comment = $this->comments->findForIssue($commentId, $issue->id);

        if ($comment === null) {
            throw new NotFoundHttpException('Comment not found.');
        }

        $this->reactions->toggle($comment->id, $actor->id, $emoji);

        return $comment->load('reactions');
    }
}
