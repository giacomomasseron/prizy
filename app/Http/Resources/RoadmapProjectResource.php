<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class RoadmapProjectResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'color'       => $this->color,
            'status'      => $this->status,
            'team_id'     => $this->team_id,
            'start_date'  => $this->start_date,
            'target_date' => $this->target_date,
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
            'milestones'  => MilestoneResource::collection($this->whenLoaded('milestones')),
        ];
    }
}
