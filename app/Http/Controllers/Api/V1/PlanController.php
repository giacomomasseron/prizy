<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AddToPlanRequest;
use App\Http\Requests\Api\V1\PlanDayRequest;
use App\Http\Requests\Api\V1\SetFocusCapacityRequest;
use App\Http\Requests\Api\V1\UpdatePlanItemRequest;
use App\Http\Resources\PlanItemResource;
use App\UseCases\Today\AddToPlan;
use App\UseCases\Today\RemoveFromPlan;
use App\UseCases\Today\SetFocusCapacity;
use App\UseCases\Today\ShowPlan;
use App\UseCases\Today\UpdatePlanItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** /v1/me/plan — the caller's own day plan (the Today v2 design). Tracker users only (the route gate). */
final class PlanController extends Controller
{
    public function __construct(
        private readonly ShowPlan $showPlan,
        private readonly AddToPlan $addToPlan,
        private readonly UpdatePlanItem $updatePlanItem,
        private readonly RemoveFromPlan $removeFromPlan,
        private readonly SetFocusCapacity $setFocusCapacity,
    ) {}

    public function index(PlanDayRequest $request): JsonResponse
    {
        $plan = $this->showPlan->handle($request->user(), $request->dayStart());

        return response()->json(['data' => [
            'capacity_minutes' => $plan['capacity_minutes'],
            'items' => PlanItemResource::collection($plan['items'])->resolve($request),
            'done_today' => PlanItemResource::collection($plan['done_today'])->resolve($request),
        ]]);
    }

    public function store(AddToPlanRequest $request): JsonResponse
    {
        $added = $this->addToPlan->handle($request->user(), (string) $request->validated('issue_id'), $request->minutes());

        return PlanItemResource::make(['item' => $added['item'], 'signals' => null])->response()->setStatusCode($added['created'] ? 201 : 200);
    }

    public function update(UpdatePlanItemRequest $request, string $issue): JsonResponse
    {
        $item = $this->updatePlanItem->handle($request->user(), $issue, $request->changes());

        return PlanItemResource::make(['item' => $item, 'signals' => null])->response();
    }

    public function destroy(Request $request, string $issue): Response
    {
        $this->removeFromPlan->handle($request->user(), $issue);

        return response()->noContent();
    }

    public function capacity(SetFocusCapacityRequest $request): JsonResponse
    {
        return response()->json(['data' => ['capacity_minutes' => $this->setFocusCapacity->handle($request->user(), (int) $request->validated('minutes'))]]);
    }
}
