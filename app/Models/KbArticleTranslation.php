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
 * Class KbArticleTranslation
 *
 * @property string $id
 * @property string $article_id
 * @property string $locale
 * @property string $title
 * @property string $body
 * @property string $status
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property KbArticle $article
 */
#[Table(
    name: 'kb_article_translations',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'article_id', 'locale', 'title', 'body', 'status'])]
class KbArticleTranslation extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'article_id' => 'string',
            'locale' => 'string',
            'title' => 'string',
            'body' => 'string',
            'status' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<KbArticle, $this>
     */
    public function article(): BelongsTo
    {
        return $this->belongsTo(KbArticle::class, 'article_id');
    }
}
