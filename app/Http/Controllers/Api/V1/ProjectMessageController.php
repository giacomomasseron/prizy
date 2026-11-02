<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ProjectMessageRequest;
use App\Http\Resources\ProjectMessageResource;
use App\UseCases\Projects\DeleteProjectMessage;
use App\UseCases\Projects\EditProjectMessage;
use App\UseCases\Projects\FindProject;
use App\UseCases\Projects\ListProjectMessages;
use App\UseCases\Projects\PostProjectMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * /v1/projects/{project}/messages — the project chat (PRD §3.2.11). Tracker users read it (the route gate + view);
 * everyone but viewers writes (`chat`); only the author edits or deletes a message (the use cases).
 */
final class ProjectMessageController extends Controller
{
    private const PAGE = 50;

    public function index(Request $request, string $project): JsonResponse
    {
        $model = FindProject::run($project);
        Gate::authorize('view', $model);

        return ProjectMessageResource::collection(ListProjectMessages::run($model->id, self::PAGE))->response();
    }

    public function store(ProjectMessageRequest $request, string $project): JsonResponse
    {
        $model = FindProject::run($project);
        Gate::authorize('chat', $model);

        $message = PostProjectMessage::run($request->user(), $model, (string) $request->validated('body'), $request->issueIds() ?? []);

        return ProjectMessageResource::make($message)->response()->setStatusCode(201);
    }

    public function update(ProjectMessageRequest $request, string $project, string $message): JsonResponse
    {
        $model = FindProject::run($project);
        Gate::authorize('chat', $model);

        $edited = EditProjectMessage::run($request->user(), $model, $message, (string) $request->validated('body'), $request->issueIds());

        return ProjectMessageResource::make($edited)->response();
    }

    public function destroy(Request $request, string $project, string $message): Response
    {
        $model = FindProject::run($project);
        Gate::authorize('chat', $model);

        DeleteProjectMessage::run($request->user(), $model, $message);

        return response()->noContent();
    }
}
