<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Issue;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** One issue picker row (PRD §3.2.1): the reference, the title and the status. */
final class IssueLookupResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'identifier' => Issue::referenceFor($this->id),
            'title' => $this->title,
            'status' => $this->status,
        ];
    }
}
