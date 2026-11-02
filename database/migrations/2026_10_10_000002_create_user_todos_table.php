<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Personal to-dos (PRD §3.2.10): private to user_id, with RLS on workspace_id as the database backstop.
 * A linked issue is optional; deleting the issue keeps the to-do and drops the link.
 */
return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE user_todos (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                body                TEXT            NOT NULL,
                issue_id            UUID            REFERENCES issues(id) ON DELETE SET NULL,
                position            DOUBLE PRECISION NOT NULL,
                completed_at        TIMESTAMPTZ,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
            );
        SQL);
        DB::statement('CREATE INDEX user_todos_user_idx ON user_todos (user_id, completed_at, position);');
        DB::statement('CREATE INDEX user_todos_issue_idx ON user_todos (issue_id);');

        // Row Level Security — empty-GUC-safe policy form (GUC app.current_workspace_id).
        DB::statement('ALTER TABLE user_todos ENABLE ROW LEVEL SECURITY;');
        DB::statement('ALTER TABLE user_todos FORCE ROW LEVEL SECURITY;');
        DB::statement(
            'CREATE POLICY user_todos_workspace_isolation ON user_todos USING ('
            ."NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL "
            ."OR workspace_id::text = current_setting('app.current_workspace_id', true));"
        );
    }

    public function down(): void
    {
        DB::statement('DROP POLICY IF EXISTS user_todos_workspace_isolation ON user_todos;');
        Schema::dropIfExists('user_todos');
    }
};
