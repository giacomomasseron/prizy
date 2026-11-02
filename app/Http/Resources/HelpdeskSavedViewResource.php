<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class HelpdeskSavedViewResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'created_by' => $this->created_by,
            'definition' => $this->definition,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
