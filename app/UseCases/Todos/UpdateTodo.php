<?php

declare(strict_types=1);

namespace App\UseCases\Todos;

use App\Models\User;
use App\Models\UserTodo;
use App\Repositories\UserTodoRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * Change one of the actor's to-dos (PRD §3.2.10): its text, done state or position. Another user's to-do → 404.
 * Done stamps completed_at (kept if already set); undone clears it and the to-do keeps its position, so it
 * returns to its old place. When a move crowds two open to-dos, the actor's open list is renumbered.
 */
final class UpdateTodo
{
    public function __construct(private readonly UserTodoRepository $todos) {}

    /** @param array{text?: string, done?: bool, position?: float} $changes */
    public function handle(User $actor, string $id, array $changes): UserTodo
    {
        $todo = $this->todos->findForUser($id, $actor->id);
        if ($todo === null) {
            throw (new ModelNotFoundException())->setModel(UserTodo::class, [$id]);
        }

        if (array_key_exists('text', $changes)) {
            $todo->body = $changes['text'];
        }
        if (array_key_exists('done', $changes)) {
            $todo->completed_at = $changes['done'] ? ($todo->completed_at ?? now()) : null;
        }
        if (array_key_exists('position', $changes)) {
            $todo->position = $changes['position'];
        }

        return DB::transaction(function () use ($actor, $todo): UserTodo {
            $this->todos->save($todo);
            if ($this->todos->openPositionsCrowded($actor->id)) {
                $this->todos->renumberOpen($actor->id);
            }

            return $todo->refresh();
        });
    }
}
