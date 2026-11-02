<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class KbArticleEditResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $a = $this->resource;
        $section = $a->section;
        $category = $section->category;

        return KbArticleSummaryResource::summary($a, $category->slug, $section->slug) + [
            'body' => $a->body,
            'section_id' => $a->section_id,
            'section' => ['id' => $section->id, 'name' => $section->name, 'slug' => $section->slug],
            'category' => ['id' => $category->id, 'name' => $category->name, 'slug' => $category->slug],
        ];
    }
}
