<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Models\Project;
use App\Models\ProjectMessage;
use App\Models\User;
use App\Repositories\ProjectMessageRepository;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Delete one of the actor's own chat messages (PRD §3.2.11): a soft delete — gone from the chat for everyone.
 * Someone else's message → 403, admins and the owner included; a deleted one or another project's → 404.
 */
final class DeleteProjectMessage
{
    public function __construct(private readonly ProjectMessageRepository $messages) {}

    public function handle(User $actor, Project $project, string $messageId): ProjectMessage
    {
        $message = $this->messages->findInProject($messageId, $project->id);
        if ($message === null) {
            throw (new ModelNotFoundException())->setModel(ProjectMessage::class, [$messageId]);
        }
        if ($message->user_id !== $actor->id) {
            throw new AuthorizationException('You can only delete your own messages.');
        }

        $this->messages->delete($message);

        return $message;
    }
}
