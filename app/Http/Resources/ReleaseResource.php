<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ReleaseResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $rollup = $this->rollup;
        $byStatus = $rollup['by_status'] ?? [];
        unset($rollup['by_status']);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'target_date' => $this->target_date?->toDateString(),
            'shipped_at' => $this->shipped_at?->toISOString(),
            'created_at' => $this->created_at,
            'rollup' => $rollup,
            $this->mergeWhen($this->relationLoaded('issues'), fn () => [
                'by_status' => $byStatus,
                'issues' => $this->issues->map(fn ($i) => [
                    'id' => $i->id,
                    'ref' => strtoupper(substr($i->id, 0, 6)),
                    'title' => $i->title,
                    'status' => $i->status,
                    'assignee' => $i->assignee ? ['id' => $i->assignee->id, 'name' => $i->assignee->name] : null,
                ])->values(),
            ]),
        ];
    }
}
