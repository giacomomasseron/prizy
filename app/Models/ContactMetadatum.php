<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class ContactMetadatum
 *
 * @property string $contact_id
 * @property string $key
 * @property string $value
 * @property Contact $contact
 */
#[Table(
    name: 'contact_metadata',
    key: 'contact_id',
    keyType: 'string',
    incrementing: false,
    timestamps: false,
)]
#[Connection('pgsql')]
#[Fillable(['contact_id', 'key', 'value'])]
class ContactMetadatum extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'contact_id' => 'string',
            'key' => 'string',
            'value' => 'string',
        ];
    }

    /**
     * @return BelongsTo<Contact, $this>
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'contact_id', 'id');
    }
}
