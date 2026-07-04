<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SparseFieldset;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class IssueResource extends JsonResource
{
    use SparseFieldset;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return $this->sparse($request, 'issues', [
            'id'              => $this->id,
            'title'           => $this->title,
            'description'     => $this->description,
            'status'          => $this->status,
            'priority'        => $this->priority,
            'estimate'        => $this->estimate,
            'due_date'        => $this->due_date,
            'sort_order'      => $this->sort_order,
            'team_id'         => $this->team_id,
            'project_id'      => $this->project_id,
            'cycle_id'        => $this->cycle_id,
            'parent_issue_id' => $this->parent_issue_id,
            'assignee_id'     => $this->assignee_id,
            'created_by'      => $this->created_by,
            'archived_at'     => $this->archived_at,
            'created_at'      => $this->created_at,
            'updated_at'      => $this->updated_at,
            'identifier'      => $this->identifier ?? null,
            'labels'          => $this->whenLoaded('labels', fn () =>
                $this->labels->map(fn ($l) => ['id' => $l->id, 'name' => $l->name, 'color' => $l->color])
            ),
            'assignee'        => $this->whenLoaded('assignee', fn () =>
                $this->assignee ? ['id' => $this->assignee->id, 'name' => $this->assignee->name] : null
            ),
        ]);
    }
}
