<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            ALTER TABLE issues
                ADD COLUMN completed_at TIMESTAMPTZ NULL;
        SQL);

        // Backfill true completion times from the audit log (latest → done event).
        DB::statement(<<<'SQL'
            UPDATE issues SET completed_at = (
                SELECT max(a.created_at) FROM issue_activities a
                WHERE a.issue_id = issues.id
                  AND a.type = 'status_changed'
                  AND a.to_value = 'done'
            ) WHERE status = 'done';
        SQL);

        // Best-effort fallback for event-less done issues (seeded/imported rows
        // that bypassed use-case activity logging).
        DB::statement(<<<'SQL'
            UPDATE issues SET completed_at = updated_at
            WHERE status = 'done' AND completed_at IS NULL;
        SQL);
    }

    public function down(): void
    {
        DB::statement(<<<'SQL'
            ALTER TABLE issues
                DROP COLUMN IF EXISTS completed_at;
        SQL);
    }
};
