<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SparseFieldset;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class IssueActivityResource extends JsonResource
{
    use SparseFieldset;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return $this->sparse($request, 'issue-activities', [
            'id'         => $this->id,
            'issue_id'   => $this->issue_id,
            'user_id'    => $this->user_id,
            'type'       => $this->type,
            'from_value' => $this->from_value,
            'to_value'   => $this->to_value,
            'created_at' => $this->created_at,
        ]);
    }
}
