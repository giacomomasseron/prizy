<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Document extends Model
{
    use HasFactory;

    protected $table = 'document';

    protected $primaryKey = 'id_document';

    protected $fillable = [
        'name',
        'description',
        'valid_from_dtm',
        'valid_to_dtm',
        'expires_at',
    ];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'document_user', 'id_document', 'id_user');
    }
}
