<?php

declare(strict_types=1);

namespace App\UseCases\Todos;

use App\Models\User;
use App\Models\UserTodo;
use App\Repositories\IssueRepository;
use App\Repositories\UserTodoRepository;
use Illuminate\Validation\ValidationException;

/**
 * Add a to-do on top of the actor's open list (PRD §3.2.10). A linked issue must be a live issue of the current
 * workspace (another workspace's or a deleted one → 422). No activity, notification or broadcast.
 */
final class AddTodo
{
    public function __construct(
        private readonly UserTodoRepository $todos,
        private readonly IssueRepository $issues,
    ) {}

    public function handle(User $actor, string $text, ?string $issueId): UserTodo
    {
        if ($issueId !== null && $this->issues->findInWorkspace($issueId) === null) {
            throw ValidationException::withMessages(['issue_id' => ['The selected issue is invalid.']]);
        }

        return $this->todos->create($actor->id, $text, $issueId, $this->todos->topPosition($actor->id));
    }
}
