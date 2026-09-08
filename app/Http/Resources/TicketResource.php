<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Services\SlaCalculator;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class TicketResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $meta = $this->requester?->contactMetadata?->keyBy('key') ?? collect();

        return [
            'id' => $this->id,
            'subject' => $this->subject,
            'status' => $this->status,
            'priority' => $this->priority,
            'channel' => $this->channel,
            'requester' => $this->requester ? [
                'id' => $this->requester->id,
                'name' => $this->requester->name,
                'email' => $this->requester->email,
                'org' => $meta->get('organization')?->value,
                'plan' => $meta->get('plan')?->value,
            ] : null,
            'assignee' => $this->assignee ? ['id' => $this->assignee->id, 'name' => $this->assignee->name] : null,
            'tags' => $this->tags->map(fn ($t) => ['id' => $t->id, 'name' => $t->name, 'color' => $t->color])->values(),
            'linked_issues' => $this->linkedIssues->map(fn ($i) => ['id' => $i->id, 'identifier' => $i->identifier, 'title' => $i->title])->values(),
            'sla_metrics' => collect(SlaCalculator::metrics($this->resource))->map(fn (array $m) => [
                'metric' => $m['metric'],
                'policy_name' => $m['policy_name'],
                'target_minutes' => $m['target_minutes'],
                'due_at' => $m['due_at']?->toISOString(),
                'state' => $m['state'],
                'remaining_minutes' => $m['remaining_minutes'],
                'within_business_hours' => $m['within_business_hours'],
            ])->values(),
            'csat_rating' => $this->csat_rating,
            'first_replied_at' => $this->first_replied_at,
            'resolved_at' => $this->resolved_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
