<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class KbArticleVersion
 *
 * @property string $id
 * @property string $article_id
 * @property string $author_id
 * @property string $title
 * @property string $body
 * @property Carbon $created_at
 * @property KbArticle $article
 * @property User $author
 */
#[Table(
    name: 'kb_article_versions',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'article_id', 'author_id', 'title', 'body'])]
class KbArticleVersion extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'article_id' => 'string',
            'author_id' => 'string',
            'title' => 'string',
            'body' => 'string',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<KbArticle, $this>
     */
    public function article(): BelongsTo
    {
        return $this->belongsTo(KbArticle::class, 'article_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
