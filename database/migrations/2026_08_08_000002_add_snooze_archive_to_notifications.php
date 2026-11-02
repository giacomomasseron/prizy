<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            ALTER TABLE notifications
                ADD COLUMN snoozed_until TIMESTAMPTZ NULL,
                ADD COLUMN archived_at TIMESTAMPTZ NULL;
        SQL);
    }

    public function down(): void
    {
        DB::statement(<<<'SQL'
            ALTER TABLE notifications
                DROP COLUMN IF EXISTS snoozed_until,
                DROP COLUMN IF EXISTS archived_at;
        SQL);
    }
};
