<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Http\Resources\Concerns\ProjectProgress;
use App\Http\Resources\Concerns\SparseFieldset;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ProjectResource extends JsonResource
{
    use ProjectProgress;
    use SparseFieldset;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return $this->sparse($request, 'projects', [
            'id'          => $this->id,
            'name'        => $this->name,
            'description' => $this->description,
            'icon'        => $this->icon,
            'color'       => $this->color,
            'status'      => $this->status,
            'team_id'     => $this->team_id,
            'lead_id'     => $this->lead_id,
            'priority'    => $this->priority,
            'start_date'  => $this->start_date,
            'target_date' => $this->target_date,
            'lead'        => $this->leadData(),
            'issue_count' => $this->issueCount(),
            'progress'    => $this->progressPercent(),
            'created_by'  => $this->created_by,
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
        ]);
    }
}
