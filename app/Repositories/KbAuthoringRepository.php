<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\KbSection;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * All-status reads + writes for KB authoring. Kept apart from KbRepository so
 * the public published-only predicate there stays the single visibility rule.
 * kb_sections/kb_articles carry no workspace scope of their own: every lookup
 * here walks up to the (WorkspaceScope'd) KbCategory, so a foreign id is just
 * "not found". RLS is the backstop underneath.
 */
final class KbAuthoringRepository
{
    public function findCategory(string $id): ?KbCategory
    {
        return Str::isUuid($id) ? KbCategory::query()->find($id) : null;
    }

    public function findSection(string $id): ?KbSection
    {
        return Str::isUuid($id)
            ? KbSection::query()->whereKey($id)->whereHas('category')->with('category')->first()
            : null;
    }

    public function categorySlugTaken(string $slug, ?string $exceptId = null): bool
    {
        return KbCategory::query()->where('slug', $slug)
            ->when($exceptId !== null, fn (Builder $q) => $q->whereKeyNot($exceptId))
            ->exists();
    }

    public function sectionSlugTaken(string $categoryId, string $slug, ?string $exceptId = null): bool
    {
        return KbSection::query()->where('category_id', $categoryId)->where('slug', $slug)
            ->when($exceptId !== null, fn (Builder $q) => $q->whereKeyNot($exceptId))
            ->exists();
    }

    /** @param array{name:string,slug:string,icon:string,color:string,description:?string} $attrs */
    public function createCategory(array $attrs): KbCategory
    {
        $attrs['id'] = (string) Str::uuid();
        $attrs['position'] = (int) (KbCategory::query()->max('position') ?? -1) + 1;

        return KbCategory::create($attrs); // workspace_id auto-filled by BelongsToWorkspace
    }

    /** @param array<string,mixed> $attrs */
    public function updateCategory(KbCategory $category, array $attrs): KbCategory
    {
        $category->fill($attrs)->save();

        return $category;
    }

    public function deleteCategory(KbCategory $category): void
    {
        $category->delete(); // FK ON DELETE CASCADE removes sections + articles
    }

    /** @param array{name:string,slug:string} $attrs */
    public function createSection(KbCategory $category, array $attrs): KbSection
    {
        $attrs['id'] = (string) Str::uuid();
        $attrs['category_id'] = $category->id;
        $attrs['position'] = (int) (KbSection::query()->where('category_id', $category->id)->max('position') ?? -1) + 1;

        return KbSection::create($attrs)->setRelation('category', $category);
    }

    /** @param array<string,mixed> $attrs */
    public function updateSection(KbSection $section, array $attrs): KbSection
    {
        $section->fill($attrs)->save();

        return $section;
    }

    public function deleteSection(KbSection $section): void
    {
        $section->delete();
    }

    public function moveCategory(KbCategory $category, string $direction): bool
    {
        $siblings = KbCategory::query()->orderBy('position')->orderBy('name')->get(['id', 'position', 'name']);

        return $this->swapWithin('kb_categories', $siblings, $category->id, $direction);
    }

    public function moveSection(KbSection $section, string $direction): bool
    {
        $siblings = KbSection::query()->where('category_id', $section->category_id)
            ->orderBy('position')->orderBy('name')->get(['id', 'position', 'name']);

        return $this->swapWithin('kb_sections', $siblings, $section->id, $direction);
    }

    public function archiveArticlesUnderCategory(KbCategory $category): int
    {
        return KbArticle::query()
            ->whereIn('section_id', KbSection::query()->select('id')->where('category_id', $category->id))
            ->where('status', '!=', 'archived')
            ->update(['status' => 'archived']);
    }

    public function archiveArticlesUnderSection(KbSection $section): int
    {
        return KbArticle::query()->where('section_id', $section->id)
            ->where('status', '!=', 'archived')
            ->update(['status' => 'archived']);
    }

    /**
     * Swap a row with its neighbour in the given ordered sibling list, then
     * renumber the whole list 0..n-1 — seeded/legacy rows share positions
     * (ties), so a bare "position ± 1" swap could not move them. Query-builder
     * updates on purpose: an Eloquent save would re-stamp updated_at, which the
     * public article page shows as "Updated".
     *
     * @param  Collection<int, KbCategory|KbSection|KbArticle>  $siblings
     * @return bool false when already at the edge (no-op)
     */
    private function swapWithin(string $table, Collection $siblings, string $id, string $direction): bool
    {
        $ids = $siblings->pluck('id')->all();
        $i = array_search($id, $ids, true);
        if ($i === false) {
            return false;
        }
        $j = $direction === 'up' ? $i - 1 : $i + 1;
        if ($j < 0 || $j >= count($ids)) {
            return false;
        }
        [$ids[$i], $ids[$j]] = [$ids[$j], $ids[$i]];

        DB::transaction(function () use ($table, $ids): void {
            foreach ($ids as $pos => $rowId) {
                DB::table($table)->where('id', $rowId)->update(['position' => $pos]);
            }
        });

        return true;
    }

    public function findArticle(string $id): ?KbArticle
    {
        return Str::isUuid($id)
            ? KbArticle::query()->whereKey($id)->whereHas('section.category')
                ->with(['section.category', 'author' => fn ($q) => $q->withTrashed()])->first()
            : null;
    }

    public function articleSlugTaken(string $sectionId, string $slug, ?string $exceptId = null): bool
    {
        return KbArticle::query()->where('section_id', $sectionId)->where('slug', $slug)
            ->when($exceptId !== null, fn (Builder $q) => $q->whereKeyNot($exceptId))
            ->exists();
    }

    /** @param array{title:string,slug:string,body:string} $attrs */
    public function createArticle(KbSection $section, User $author, array $attrs): KbArticle
    {
        $article = KbArticle::create($attrs + [
            'id' => (string) Str::uuid(),
            'section_id' => $section->id,
            'author_id' => $author->id,
            'status' => 'draft',
            'position' => $this->nextArticlePosition($section->id),
        ]);

        return $this->findArticle($article->id);
    }

    /** @param array<string,mixed> $attrs (section_id present only when moving sections) */
    public function updateArticle(KbArticle $article, array $attrs): KbArticle
    {
        if (isset($attrs['section_id']) && $attrs['section_id'] !== $article->section_id) {
            $attrs['position'] = $this->nextArticlePosition($attrs['section_id']);
        }
        $article->fill($attrs)->save();

        return $this->findArticle($article->id);
    }

    public function deleteArticle(KbArticle $article): void
    {
        $article->forceDelete(); // a soft-deleted row would hold its slug under UNIQUE(section_id, slug)
    }

    public function moveArticle(KbArticle $article, string $direction): bool
    {
        $siblings = KbArticle::query()->where('section_id', $article->section_id)
            ->orderBy('position')->orderBy('title')->get(['id', 'position', 'title']);

        return $this->swapWithin('kb_articles', $siblings, $article->id, $direction);
    }

    /** @return Collection<int, KbCategory> full tree, every status, position order, authors loaded */
    public function libraryTree(): Collection
    {
        return KbCategory::query()->orderBy('position')->orderBy('name')
            ->with(['kbSections' => function ($q): void {
                $q->orderBy('position')->orderBy('name')
                    ->with(['kbArticles' => function ($q): void {
                        $q->orderBy('position')->orderBy('title')
                            ->with(['author' => fn ($q) => $q->withTrashed()->select(['id', 'name'])]);
                    }]);
            }])
            ->get();
    }

    private function nextArticlePosition(string $sectionId): int
    {
        return (int) (KbArticle::query()->where('section_id', $sectionId)->max('position') ?? -1) + 1;
    }
}
