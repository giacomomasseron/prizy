<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SparseFieldset;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class IssueCommentResource extends JsonResource
{
    use SparseFieldset;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return $this->sparse($request, 'issue-comments', [
            'id' => $this->id,
            'issue_id' => $this->issue_id,
            'user_id' => $this->user_id,
            'body' => $this->body,
            'is_internal' => $this->is_internal,
            'edited_at' => $this->edited_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'reactions' => collect($this->reactions)->groupBy('emoji')->map(fn ($rows, $emoji) => [
                'emoji' => $emoji,
                'count' => $rows->count(),
                'reacted' => $rows->contains('user_id', $request->user()?->id),
            ])->values()->all(),
        ]);
    }
}
