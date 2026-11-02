<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class KbSection
 *
 * @property string $id
 * @property string $category_id
 * @property string $name
 * @property string $slug
 * @property int $position
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property KbCategory $category
 * @property Collection|User[] $kbArticlesUsers
 * @property Collection|KbArticle[] $kbArticles
 */
#[Table(
    name: 'kb_sections',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'category_id', 'name', 'slug', 'position'])]
class KbSection extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'category_id' => 'string',
            'name' => 'string',
            'slug' => 'string',
            'position' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<KbArticle, $this>
     */
    public function kbArticles(): HasMany
    {
        return $this->hasMany(KbArticle::class, 'section_id', 'id');
    }

    /**
     * @return BelongsTo<KbCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(KbCategory::class, 'category_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function kbArticlesUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'kb_articles', 'id', 'id')
            ->withPivot('section_id', 'author_id', 'title', 'slug', 'body', 'status', 'position', 'views_count', 'helpful_count', 'unhelpful_count', 'published_at', 'deleted_at')
            ->withTimestamps();
    }
}
