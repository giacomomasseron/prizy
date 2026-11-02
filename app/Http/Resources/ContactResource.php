<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ContactResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $meta = $this->contactMetadata->keyBy('key');

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'org' => $meta->get('organization')?->value,
            'plan' => $meta->get('plan')?->value,
        ];
    }
}
