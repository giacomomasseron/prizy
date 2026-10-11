<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Models\Project;
use App\Models\ProjectMessage;
use App\Models\User;
use App\Repositories\IssueRepository;
use App\Repositories\ProjectMessageRepository;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Edit one of the actor's own chat messages (PRD §3.2.11): new text and links, stamped edited_at. Someone else's
 * message → 403, admins and the owner included (a rule of its own: the owner's Gate::before bypass does not reach
 * it). A deleted message, or one from another project → 404.
 */
final class EditProjectMessage
{
    public function __construct(
        private readonly ProjectMessageRepository $messages,
        private readonly IssueRepository $issues,
    ) {}

    /** @param list<string> $issueIds */
    public function handle(User $actor, Project $project, string $messageId, string $body, array $issueIds): ProjectMessage
    {
        $message = $this->messages->findInProject($messageId, $project->id);
        if ($message === null) {
            throw (new ModelNotFoundException())->setModel(ProjectMessage::class, [$messageId]);
        }
        if ($message->user_id !== $actor->id) {
            throw new AuthorizationException('You can only edit your own messages.');
        }
        if (count($this->issues->findManyByIds($issueIds)) !== count($issueIds)) {
            throw ValidationException::withMessages(['issue_ids' => ['The selected issues are invalid.']]);
        }

        return DB::transaction(fn (): ProjectMessage => $this->messages->edit($message, $body, $issueIds));
    }
}
