<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Issue;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One personal to-do (PRD §3.2.10). `issue` is the linked issue's picker row — null when there is none or the
 * issue was deleted; an archived issue keeps its link.
 */
final class TodoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $issue = $this->issue;

        return [
            'id' => $this->id,
            'text' => $this->body,
            'done' => $this->completed_at !== null,
            'completed_at' => $this->completed_at?->toISOString(),
            'position' => $this->position,
            'issue' => $issue === null ? null : [
                'id' => $issue->id,
                'identifier' => Issue::referenceFor($issue->id),
                'title' => $issue->title,
                'status' => $issue->status,
            ],
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
