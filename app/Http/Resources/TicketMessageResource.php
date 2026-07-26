<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class TicketMessageResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $kind = $this->sender_type === 'contact'
            ? 'customer'
            : ($this->is_internal ? 'note' : 'agent');

        $senderName = $this->sender_type === 'contact'
            ? $this->senderContact?->name
            : $this->senderUser?->name;

        return [
            'id' => $this->id,
            'kind' => $kind,
            'sender' => ['name' => $senderName],
            'body' => $this->body,
            'created_at' => $this->created_at,
        ];
    }
}
