<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class KbArticleVersionDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $version = $this->resource['version'];

        return [
            'id' => $version->id,
            'author' => ['id' => $version->author->id, 'name' => $version->author->name],
            'created_at' => $version->created_at?->toIso8601String(),
            'summary' => $this->resource['summary'],
            'is_current' => $this->resource['is_current'],
            'title' => $version->title,
            'body' => $version->body,
            'html' => $this->resource['html'],
            'diff' => $this->resource['diff'],
        ];
    }
}
