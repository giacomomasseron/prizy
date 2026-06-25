<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE automation_actions (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                automation_id       UUID            NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
                action_type         VARCHAR(64)     NOT NULL,
                action_value        TEXT,
                sort_order          SMALLINT        NOT NULL DEFAULT 0
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_actions');
    }
};
