<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The day plan (the Today v2 design): the issues a user means to work on today, in their order, each with a personal
 * time estimate. Private to user_id, with RLS on workspace_id as the database backstop. Also the user's daily focus
 * capacity (6 hours by default).
 */
return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE user_plan_items (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                issue_id            UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
                position            DOUBLE PRECISION NOT NULL,
                minutes             SMALLINT        NOT NULL,
                previous_status     issue_status,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                CONSTRAINT user_plan_items_user_issue_unique UNIQUE (user_id, issue_id),
                CONSTRAINT user_plan_items_minutes_check CHECK (minutes BETWEEN 15 AND 720)
            );
        SQL);
        DB::statement('CREATE INDEX user_plan_items_user_idx ON user_plan_items (user_id, position);');
        DB::statement('CREATE INDEX user_plan_items_issue_idx ON user_plan_items (issue_id);');

        // Row Level Security — empty-GUC-safe policy form (GUC app.current_workspace_id).
        DB::statement('ALTER TABLE user_plan_items ENABLE ROW LEVEL SECURITY;');
        DB::statement('ALTER TABLE user_plan_items FORCE ROW LEVEL SECURITY;');
        DB::statement(
            'CREATE POLICY user_plan_items_workspace_isolation ON user_plan_items USING ('
            ."NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL "
            ."OR workspace_id::text = current_setting('app.current_workspace_id', true));"
        );

        DB::statement('ALTER TABLE users ADD COLUMN daily_focus_minutes SMALLINT NOT NULL DEFAULT 360;');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE users DROP COLUMN IF EXISTS daily_focus_minutes;');
        DB::statement('DROP POLICY IF EXISTS user_plan_items_workspace_isolation ON user_plan_items;');
        Schema::dropIfExists('user_plan_items');
    }
};
