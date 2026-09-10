<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE tickets ADD COLUMN contact_seen_at TIMESTAMPTZ NULL;');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE tickets DROP COLUMN IF EXISTS contact_seen_at;');
    }
};
