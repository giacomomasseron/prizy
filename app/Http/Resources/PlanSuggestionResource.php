<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An issue that could also fit today (the Today v2 design). The resource is `['issue' => Issue, 'minutes' => the time
 * it would start with, 'signals' => PlanSignals' answer]`.
 */
final class PlanSuggestionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'issue' => PlanIssueResource::make($this->resource['issue'])->resolve($request),
            'minutes' => $this->resource['minutes'],
            'tag' => $this->resource['signals']['tag'],
            'reason' => $this->resource['signals']['reason'],
        ];
    }
}
