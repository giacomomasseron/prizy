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
    public function index(Request $request): JsonResponse
    {
        return TodoResource::collection(ListTodos::run($request->user()))->response();
    }

    public function store(AddTodoRequest $request): JsonResponse
    {
        $issueId = $request->validated('issue_id');
        $todo = AddTodo::run($request->user(), (string) $request->validated('text'), is_string($issueId) ? $issueId : null);

        return TodoResource::make($todo)->response()->setStatusCode(201);
    }

    public function update(UpdateTodoRequest $request, string $todo): JsonResponse
    {
        return TodoResource::make(UpdateTodo::run($request->user(), $todo, $request->changes()))->response();
    }

    public function destroy(Request $request, string $todo): Response
    {
        DeleteTodo::run($request->user(), $todo);

        return response()->noContent();
    }

    public function clearDone(Request $request): Response
    {
        ClearCompletedTodos::run($request->user());

        return response()->noContent();
    }
}
