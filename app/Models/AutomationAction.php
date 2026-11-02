<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class AutomationAction
 *
 * @property string $id
 * @property string $automation_id
 * @property string $action_type
 * @property string|null $action_value
 * @property int $sort_order
 * @property Automation $automation
 */
#[Table(
    name: 'automation_actions',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'automation_id', 'action_type', 'action_value', 'sort_order'])]
class AutomationAction extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'automation_id' => 'string',
            'action_type' => 'string',
            'action_value' => 'string',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Automation, $this>
     */
    public function automation(): BelongsTo
    {
        return $this->belongsTo(Automation::class, 'automation_id');
    }
}
