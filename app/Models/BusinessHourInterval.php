<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class BusinessHourInterval
 *
 * @property string $id
 * @property string $schedule_id
 * @property int $day_of_week
 * @property string $opens_at
 * @property string $closes_at
 * @property BusinessHourSchedule $schedule
 */
#[Table(
    name: 'business_hour_intervals',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'schedule_id', 'day_of_week', 'opens_at', 'closes_at'])]
class BusinessHourInterval extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'schedule_id' => 'string',
            'day_of_week' => 'integer',
            'opens_at' => 'string',
            'closes_at' => 'string',
        ];
    }

    /**
     * @return BelongsTo<BusinessHourSchedule, $this>
     */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(BusinessHourSchedule::class, 'schedule_id');
    }
}
