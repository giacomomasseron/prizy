<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SparseFieldset;
use App\Models\Ticket;
use App\Services\HelpdeskAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class IssueResource extends JsonResource
{
    use SparseFieldset;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return $this->sparse($request, 'issues', [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'estimate' => $this->estimate,
            'due_date' => $this->due_date,
            'sort_order' => $this->sort_order,
            'team_id' => $this->team_id,
            'project_id' => $this->project_id,
            'cycle_id' => $this->cycle_id,
            'parent_issue_id' => $this->parent_issue_id,
            'assignee_id' => $this->assignee_id,
            'created_by' => $this->created_by,
            'archived_at' => $this->archived_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'identifier' => $this->identifier ?? null,
            'labels' => $this->whenLoaded('labels', fn () => $this->labels->map(fn ($l) => ['id' => $l->id, 'name' => $l->name, 'color' => $l->color])
            ),
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? ['id' => $this->assignee->id, 'name' => $this->assignee->name] : null
            ),
            // Embedded so the issue detail (reachable by agents via the ticket→issue bridge)
            // can render the current project/cycle name WITHOUT listing all of them — the
            // /v1/projects and /v1/cycles lists are is_developer-gated.
            'project' => $this->whenLoaded('project', fn () => $this->project ? ['id' => $this->project->id, 'name' => $this->project->name, 'color' => $this->project->color] : null
            ),
            'cycle' => $this->whenLoaded('cycle', fn () => $this->cycle ? ['id' => $this->cycle->id, 'name' => $this->cycle->name] : null
            ),
            'release' => $this->whenLoaded('release', fn () => $this->release ? ['id' => $this->release->id, 'name' => $this->release->name, 'shipped_at' => $this->release->shipped_at?->toISOString()] : null),
            'support_ticket' => $this->whenLoaded('supportTickets', function () {
                /** @var Ticket|null $ticket */
                $ticket = $this->supportTickets->first();
                // The card links into the desk, which a workspace with the support
                // module switched off answers 404 on — so the bridge closes with it.
                if ($ticket === null || ! HelpdeskAccess::enabledFor($ticket->workspace_id)) {
                    return null;
                }
                $meta = $ticket->requester?->contactMetadata->keyBy('key');

                return [
                    'id' => $ticket->id,
                    'ref' => 'TKT-'.strtoupper(substr($ticket->id, 0, 6)),
                    'subject' => $ticket->subject,
                    'customer' => $meta?->get('organization')?->value ?? $ticket->requester?->name,
                    'plan' => $meta?->get('plan')?->value,
                ];
            }),
        ]);
    }
}
