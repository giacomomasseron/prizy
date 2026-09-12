<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\KbSection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Returned via response()->json(['data' => (new self($tree))->toArray($request)])
 * rather than as a bare JsonResource — deliberate, to avoid JsonResource's
 * collection-wrapping behaviour for the top-level categories collection.
 */
final class KbLibraryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return ['categories' => $this->resource->map(fn (KbCategory $c) => [
            'id' => $c->id, 'name' => $c->name, 'slug' => $c->slug, 'icon' => $c->icon, 'color' => $c->color, 'description' => $c->description, 'position' => (int) $c->position,
            'sections' => $c->kbSections->map(fn (KbSection $s) => [
                'id' => $s->id, 'category_id' => $s->category_id, 'name' => $s->name, 'slug' => $s->slug, 'position' => (int) $s->position,
                'articles' => $s->kbArticles->map(fn (KbArticle $a) => KbArticleSummaryResource::summary($a, $c->slug, $s->slug))->values()->all(),
            ])->values()->all(),
        ])->values()->all()];
    }
}
