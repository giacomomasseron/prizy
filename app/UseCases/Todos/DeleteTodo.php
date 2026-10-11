<?php

declare(strict_types=1);

namespace App\UseCases\Todos;

use App\Models\User;
use App\Models\UserTodo;
use App\Repositories\UserTodoRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/** Delete one of the actor's to-dos straight away (PRD §3.2.10). Another user's to-do → 404. */
final class DeleteTodo
{
    public function __construct(private readonly UserTodoRepository $todos) {}

    public function handle(User $actor, string $id): void
    {
        $todo = $this->todos->findForUser($id, $actor->id);
        if ($todo === null) {
            throw (new ModelNotFoundException())->setModel(UserTodo::class, [$id]);
        }

        $this->todos->delete($todo);
    }
}
