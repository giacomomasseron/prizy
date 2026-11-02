<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\KbArticle;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class KbArticleSummaryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public static function summary(KbArticle $a, string $categorySlug, string $sectionSlug): array
    {
        $published = $a->status === 'published' && $a->published_at !== null;

        return [
            'id' => $a->id, 'title' => $a->title, 'slug' => $a->slug, 'status' => $a->status, 'position' => (int) $a->position,
            'author' => ['id' => $a->author->id, 'name' => $a->author->name],
            'views_count' => (int) $a->views_count, 'helpful_count' => (int) $a->helpful_count, 'unhelpful_count' => (int) $a->unhelpful_count,
            'published_at' => $a->published_at?->toIso8601String(), 'updated_at' => $a->updated_at?->toIso8601String(), 'created_at' => $a->created_at?->toIso8601String(),
            'public_url' => $published ? url('/help/'.$categorySlug.'/'.$sectionSlug.'/'.$a->slug) : null,
        ];
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return self::summary($this->resource, $this->resource->section->category->slug, $this->resource->section->slug);
    }
}
