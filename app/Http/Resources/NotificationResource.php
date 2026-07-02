<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class NotificationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'type'         => $this->type,
            'subject_type' => $this->subject_type,
            'subject_id'   => $this->subject_id,
            'read_at'      => $this->read_at,
            'created_at'   => $this->created_at,
        ];
    }
}
