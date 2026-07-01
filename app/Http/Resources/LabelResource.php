<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SparseFieldset;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class LabelResource extends JsonResource
{
    use SparseFieldset;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return $this->sparse($request, 'labels', [
            'id'         => $this->id,
            'name'       => $this->name,
            'color'      => $this->color,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ]);
    }
}
