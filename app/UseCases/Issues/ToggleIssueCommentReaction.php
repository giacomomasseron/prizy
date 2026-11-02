<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\User;
use App\Repositories\IssueCommentReactionRepository;
use App\Repositories\IssueCommentRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * @method static IssueComment run(User $actor, Issue $issue, string $commentId, string $emoji)
 */
final class ToggleIssueCommentReaction extends BaseUseCase implements UseCaseInterface
{
    private readonly IssueCommentRepository $comments;

    private readonly IssueCommentReactionRepository $reactions;

    public function handle(mixed ...$arguments): mixed
    {
        $this->comments = app(IssueCommentRepository::class);
        $this->reactions = app(IssueCommentReactionRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(User $actor, Issue $issue, string $commentId, string $emoji): IssueComment
    {
        $comment = $this->comments->findForIssue($commentId, $issue->id);

        if ($comment === null) {
            throw new NotFoundHttpException('Comment not found.');
        }

        $this->reactions->toggle($comment->id, $actor->id, $emoji);

        return $comment->load('reactions');
    }
}
