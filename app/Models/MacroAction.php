<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class MacroAction
 *
 * @property string $id
 * @property string $macro_id
 * @property string $action_type
 * @property string|null $action_value
 * @property int $sort_order
 * @property Macro $macro
 */
#[Table(
    name: 'macro_actions',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'macro_id', 'action_type', 'action_value', 'sort_order'])]
class MacroAction extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'macro_id' => 'string',
            'action_type' => 'string',
            'action_value' => 'string',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Macro, $this>
     */
    public function macro(): BelongsTo
    {
        return $this->belongsTo(Macro::class, 'macro_id');
    }
}
