<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Issue;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class NotificationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'subject_type' => $this->subject_type,
            'subject_id' => $this->subject_id,
            'body' => $this->body,
            'actor' => $this->whenLoaded('actor', fn () => ['id' => $this->actor->id, 'name' => $this->actor->name]),
            'subject' => $this->whenLoaded('subject', fn () => [
                'type' => 'issue',
                'id' => $this->subject_id,
                'ref' => Issue::referenceFor((string) $this->subject_id),
                'title' => $this->subject->title,
                'path' => "/issues/{$this->subject_id}",
            ]),
            'read_at' => $this->read_at,
            'snoozed_until' => $this->snoozed_until,
            'archived_at' => $this->archived_at,
            'created_at' => $this->created_at,
        ];
    }
}
