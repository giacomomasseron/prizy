<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class Tag
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $name
 * @property string $color
 * @property Carbon $created_at
 * @property Workspace $workspace
 * @property Collection|Ticket[] $ticketTagsTickets
 * @property Collection|TicketTag[] $ticketTags
 */
#[Table(
    name: 'tags',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'name', 'color'])]
class Tag extends TenantAwareEntity
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'workspace_id' => 'string',
            'name' => 'string',
            'color' => 'string',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<TicketTag, $this>
     */
    public function ticketTags(): HasMany
    {
        return $this->hasMany(TicketTag::class, 'tag_id', 'id');
    }

    /**
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    /**
     * @return BelongsToMany<Ticket, $this>
     */
    public function ticketTagsTickets(): BelongsToMany
    {
        return $this->belongsToMany(Ticket::class, 'ticket_tags', 'id', 'id')
            ->withPivot('tag_id');
    }
}
