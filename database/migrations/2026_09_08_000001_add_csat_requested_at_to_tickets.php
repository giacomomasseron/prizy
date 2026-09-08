<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            ALTER TABLE tickets
                ADD COLUMN csat_requested_at TIMESTAMPTZ NULL;
        SQL);
    }

    public function down(): void
    {
        DB::statement(<<<'SQL'
            ALTER TABLE tickets
                DROP COLUMN IF EXISTS csat_requested_at;
        SQL);
    }
};
