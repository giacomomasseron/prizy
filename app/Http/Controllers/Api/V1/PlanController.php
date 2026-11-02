<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AddToPlanRequest;
use App\Http\Requests\Api\V1\PlanDayRequest;
use App\Http\Requests\Api\V1\SetFocusCapacityRequest;
use App\Http\Requests\Api\V1\UpdatePlanItemRequest;
use App\Http\Resources\PlanItemResource;
use App\Http\Resources\PlanSuggestionResource;
use App\UseCases\Issues\FindIssue;
use App\UseCases\Today\AddToPlan;
use App\UseCases\Today\CompletePlanItem;
use App\UseCases\Today\RemoveFromPlan;
use App\UseCases\Today\SetFocusCapacity;
use App\UseCases\Today\ShowPlan;
use App\UseCases\Today\SuggestForPlan;
use App\UseCases\Today\UndoPlanItem;
use App\UseCases\Today\UpdatePlanItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/** /v1/me/plan — the caller's own day plan (the Today v2 design). Tracker users only (the route gate). */
final class PlanController extends Controller
{
    public function index(PlanDayRequest $request): JsonResponse
    {
        $plan = ShowPlan::run($request->user(), $request->dayStart());

        return response()->json(['data' => [
            'capacity_minutes' => $plan['capacity_minutes'],
            'items' => PlanItemResource::collection($plan['items'])->resolve($request),
            'done_today' => PlanItemResource::collection($plan['done_today'])->resolve($request),
        ]]);
    }

    public function suggestions(PlanDayRequest $request): JsonResponse
    {
        return PlanSuggestionResource::collection(SuggestForPlan::run($request->user(), $request->dayStart()))->response();
    }

    public function store(AddToPlanRequest $request): JsonResponse
    {
        $added = AddToPlan::run($request->user(), (string) $request->validated('issue_id'), $request->minutes());

        return PlanItemResource::make(['item' => $added['item'], 'signals' => null])->response()->setStatusCode($added['created'] ? 201 : 200);
    }

    public function update(UpdatePlanItemRequest $request, string $issue): JsonResponse
    {
        $item = UpdatePlanItem::run($request->user(), $issue, $request->changes());

        return PlanItemResource::make(['item' => $item, 'signals' => null])->response();
    }

    public function destroy(Request $request, string $issue): Response
    {
        RemoveFromPlan::run($request->user(), $issue);

        return response()->noContent();
    }

    /** Done completes the issue itself, so it needs the right to change it (viewers → 403). */
    public function done(Request $request, string $issue): JsonResponse
    {
        Gate::authorize('update', FindIssue::run($issue));

        return PlanItemResource::make(['item' => CompletePlanItem::run($request->user(), $issue), 'signals' => null])->response();
    }

    public function undo(Request $request, string $issue): JsonResponse
    {
        Gate::authorize('update', FindIssue::run($issue));

        return PlanItemResource::make(['item' => UndoPlanItem::run($request->user(), $issue), 'signals' => null])->response();
    }

    public function capacity(SetFocusCapacityRequest $request): JsonResponse
    {
        return response()->json(['data' => ['capacity_minutes' => SetFocusCapacity::run($request->user(), (int) $request->validated('minutes'))]]);
    }
}
