<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Services\KbLocales;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class KbArticleTranslationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'locale' => $this->resource->locale,
            'name' => (string) KbLocales::name($this->resource->locale),
            // Always false: the source language never has a translation row.
            'is_source' => false,
            'title' => $this->resource->title,
            'body' => $this->resource->body,
            'status' => $this->resource->status,
            'updated_at' => $this->resource->updated_at?->toIso8601String(),
        ];
    }
}
