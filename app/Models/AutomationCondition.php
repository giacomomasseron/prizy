<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class AutomationCondition
 *
 * @property string $id
 * @property string $automation_id
 * @property string $field
 * @property string $operator
 * @property string $value
 * @property int $sort_order
 * @property Automation $automation
 */
#[Table(
    name: 'automation_conditions',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'automation_id', 'field', 'operator', 'value', 'sort_order'])]
class AutomationCondition extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'automation_id' => 'string',
            'field' => 'string',
            'operator' => 'string',
            'value' => 'string',
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
