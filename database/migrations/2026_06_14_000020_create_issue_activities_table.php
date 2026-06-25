<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE issue_activities (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                issue_id            UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
                user_id             UUID            REFERENCES users(id) ON DELETE SET NULL,
                type                VARCHAR(64)     NOT NULL,
                from_value          TEXT,
                to_value            TEXT,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_activities');
    }
};
