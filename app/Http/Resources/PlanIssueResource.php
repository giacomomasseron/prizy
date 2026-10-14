<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Issue;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** An issue as Today shows it (the Today v2 design): reference, title, status, priority, points and project. */
final class PlanIssueResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $project = $this->project;

        return [
            'id' => $this->id,
            'identifier' => Issue::referenceFor($this->id),
            'title' => $this->title,
            'status' => $this->status,
            'priority' => $this->priority,
            'estimate' => $this->estimate,
            'project' => $project === null ? null : ['id' => $project->id, 'name' => $project->name, 'color' => $project->color],
        ];
    }
}
