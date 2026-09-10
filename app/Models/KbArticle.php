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
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Class KbArticle
 *
 * @property string $id
 * @property string $section_id
 * @property string $author_id
 * @property string $title
 * @property string $slug
 * @property string $body
 * @property string $status
 * @property int $position
 * @property int $views_count
 * @property int $helpful_count
 * @property int $unhelpful_count
 * @property Carbon|null $published_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property string|null $search (generated tsvector — never set manually)
 * @property User $author
 * @property KbSection $section
 * @property Collection|User[] $kbArticleVersionsUsers
 * @property Collection|KbArticleTranslation[] $kbArticleTranslations
 * @property Collection|KbArticleVersion[] $kbArticleVersions
 */
#[Table(
    name: 'kb_articles',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'section_id', 'author_id', 'title', 'slug', 'body', 'status', 'position', 'views_count', 'helpful_count', 'unhelpful_count', 'published_at'])]
class KbArticle extends Model
{
    use SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'section_id' => 'string',
            'author_id' => 'string',
            'title' => 'string',
            'slug' => 'string',
            'body' => 'string',
            'status' => 'string',
            'position' => 'integer',
            'views_count' => 'integer',
            'helpful_count' => 'integer',
            'unhelpful_count' => 'integer',
            'published_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<KbArticleTranslation, $this>
     */
    public function kbArticleTranslations(): HasMany
    {
        return $this->hasMany(KbArticleTranslation::class, 'article_id', 'id');
    }

    /**
     * @return HasMany<KbArticleVersion, $this>
     */
    public function kbArticleVersions(): HasMany
    {
        return $this->hasMany(KbArticleVersion::class, 'article_id', 'id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /**
     * @return BelongsTo<KbSection, $this>
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(KbSection::class, 'section_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function kbArticleVersionsUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'kb_article_versions', 'id', 'id')
            ->withPivot('article_id', 'author_id', 'title', 'body', 'created_at');
    }
}
