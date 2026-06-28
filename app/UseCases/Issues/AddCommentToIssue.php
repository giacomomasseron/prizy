<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Events\IssueCommented;
use App\Models\IssueComment;
use App\Models\User;
use App\Repositories\IssueCommentRepository;
use App\Repositories\IssueRepository;
use Illuminate\Validation\ValidationException;

final class AddCommentToIssue
{
    public function __construct(
        private readonly IssueRepository $issues,
        private readonly IssueCommentRepository $comments,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): IssueComment
    {
        $issue = $this->issues->findInWorkspace((string) $data['issue_id']);

        if ($issue === null) {
            throw ValidationException::withMessages(['issue_id' => ['The selected issue is invalid.']]);
        }

        $comment = $this->comments->create([
            'issue_id'    => $issue->id,
            'user_id'     => $actor->id,
            'body'        => $data['body'],
            'is_internal' => (bool) ($data['is_internal'] ?? false),
        ]);

        event(new IssueCommented($issue, $comment));

        return $comment;
    }
}
