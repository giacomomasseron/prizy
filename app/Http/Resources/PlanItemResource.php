<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\UserPlanItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An issue on the caller's day plan (the Today v2 design). The resource is `['item' => UserPlanItem, 'signals' =>
 * PlanSignals' answer or null]`: a write answers without signals (tag and reason null); the plan's read has them.
 */
final class PlanItemResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var UserPlanItem $item */
        $item = $this->resource['item'];
        $signals = $this->resource['signals'] ?? null;

        return [
            'issue' => PlanIssueResource::make($item->issue)->resolve($request),
            'minutes' => $item->minutes,
            'position' => $item->position,
            'tag' => $signals['tag'] ?? null,
            'reason' => $signals['reason'] ?? null,
            'can_undo' => $item->canUndo(),
        ];
    }
}
