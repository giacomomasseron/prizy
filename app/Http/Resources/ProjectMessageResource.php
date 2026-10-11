<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Issue;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One project chat message (PRD §3.2.11). `issues` holds its live linked issues: a deleted issue drops out, so its
 * reference in the text reads as plain text.
 */
final class ProjectMessageResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'user_id' => $this->user_id,
            'body' => $this->body,
            'edited_at' => $this->edited_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'issues' => $this->issues->map(fn (Issue $issue): array => [
                'id' => $issue->id,
                'identifier' => Issue::referenceFor($issue->id),
                'title' => $issue->title,
                'status' => $issue->status,
            ])->values()->all(),
        ];
    }
}
