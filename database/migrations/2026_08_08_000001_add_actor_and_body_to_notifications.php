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
                ADD COLUMN actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
                ADD COLUMN body TEXT NULL;
        SQL);
    }

    public function down(): void
    {
        DB::statement(<<<'SQL'
            ALTER TABLE notifications
                DROP COLUMN IF EXISTS actor_id,
                DROP COLUMN IF EXISTS body;
        SQL);
    }
};
