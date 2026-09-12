<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\KbArticleVersion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class KbArticleVersionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public static function summary(KbArticleVersion $v): array
    {
        return [
            'id' => $v->id,
            'author' => ['id' => $v->author->id, 'name' => $v->author->name],
            'created_at' => $v->created_at?->toIso8601String(),
            'summary' => (string) $v->getAttribute('summary'),
            'is_current' => (bool) $v->getAttribute('is_current'),
        ];
    }

    public function toArray(Request $request): array
    {
        return self::summary($this->resource);
    }
}
