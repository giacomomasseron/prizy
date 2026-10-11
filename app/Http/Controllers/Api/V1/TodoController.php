<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AddTodoRequest;
use App\Http\Requests\Api\V1\UpdateTodoRequest;
use App\Http\Resources\TodoResource;
use App\UseCases\Todos\AddTodo;
use App\UseCases\Todos\ClearCompletedTodos;
use App\UseCases\Todos\DeleteTodo;
use App\UseCases\Todos\ListTodos;
use App\UseCases\Todos\UpdateTodo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** /v1/me/todos — the caller's own to-dos (PRD §3.2.10). Tracker users only (the route gate). */
final class TodoController extends Controller
{
    public function __construct(
        private readonly ListTodos $listTodos,
        private readonly AddTodo $addTodo,
        private readonly UpdateTodo $updateTodo,
        private readonly DeleteTodo $deleteTodo,
        private readonly ClearCompletedTodos $clearCompletedTodos,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return TodoResource::collection($this->listTodos->handle($request->user()))->response();
    }

    public function store(AddTodoRequest $request): JsonResponse
    {
        $issueId = $request->validated('issue_id');
        $todo = $this->addTodo->handle($request->user(), (string) $request->validated('text'), is_string($issueId) ? $issueId : null);

        return TodoResource::make($todo)->response()->setStatusCode(201);
    }

    public function update(UpdateTodoRequest $request, string $todo): JsonResponse
    {
        return TodoResource::make($this->updateTodo->handle($request->user(), $todo, $request->changes()))->response();
    }

    public function destroy(Request $request, string $todo): Response
    {
        $this->deleteTodo->handle($request->user(), $todo);

        return response()->noContent();
    }

    public function clearDone(Request $request): Response
    {
        $this->clearCompletedTodos->handle($request->user());

        return response()->noContent();
    }
}
