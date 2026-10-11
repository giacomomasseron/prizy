<?php

declare(strict_types=1);

namespace App\UseCases\Todos;

use App\Models\User;
use App\Repositories\UserTodoRepository;

/** Clear: delete every done to-do of the actor (PRD §3.2.10). The open ones and other users' lists are untouched. */
final class ClearCompletedTodos
{
    public function __construct(private readonly UserTodoRepository $todos) {}

    public function handle(User $actor): void
    {
        $this->todos->deleteDone($actor->id);
    }
}
