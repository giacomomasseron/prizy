<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class SlaPolicyResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'first_reply_minutes' => (int) $this->first_reply_minutes,
            'next_reply_minutes' => $this->next_reply_minutes !== null ? (int) $this->next_reply_minutes : null,
            'resolution_minutes' => (int) $this->resolution_minutes,
            'schedule_id' => $this->schedule_id,
            'schedule_name' => $this->schedule?->name,
        ];
    }
}
