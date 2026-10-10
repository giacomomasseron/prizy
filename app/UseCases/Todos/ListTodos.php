<?php

declare(strict_types=1);

namespace App\UseCases\Todos;

use App\Models\User;
use App\Models\UserTodo;
use App\Repositories\UserTodoRepository;
use Illuminate\Support\Collection;

/** The actor's own to-dos (PRD §3.2.10): the open ones in their order, then the done ones, newest first. */
final class ListTodos
{
    public function __construct(private readonly UserTodoRepository $todos) {}

    /** @return Collection<int, UserTodo> */
    public function handle(User $actor): Collection
    {
        return $this->todos->listForUser($actor->id);
    }
}
