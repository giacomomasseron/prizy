<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE automation_conditions (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                automation_id       UUID            NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
                field               VARCHAR(64)     NOT NULL,   -- 'priority', 'channel', 'tag', ...
                operator            VARCHAR(16)     NOT NULL,   -- 'eq', 'neq', 'contains', ...
                value               TEXT            NOT NULL,
                sort_order          SMALLINT        NOT NULL DEFAULT 0
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_conditions');
    }
};
