<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Project chat (PRD §3.2.11): one chat per project, kept forever. A message is soft-deleted by its author; the
 * issues it links live in project_message_issues (scoped through the message: no workspace_id, no RLS of its own).
 */
return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE project_messages (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                project_id          UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                user_id             UUID            NOT NULL REFERENCES users(id),
                body                TEXT            NOT NULL,
                edited_at           TIMESTAMPTZ,
                deleted_at          TIMESTAMPTZ,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
            );
        SQL);
        DB::statement('CREATE INDEX project_messages_project_idx ON project_messages (project_id, created_at, id);');

        // Row Level Security — empty-GUC-safe policy form (GUC app.current_workspace_id).
        DB::statement('ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;');
        DB::statement('ALTER TABLE project_messages FORCE ROW LEVEL SECURITY;');
        DB::statement(
            'CREATE POLICY project_messages_workspace_isolation ON project_messages USING ('
            ."NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL "
            ."OR workspace_id::text = current_setting('app.current_workspace_id', true));"
        );

        DB::statement(<<<'SQL'
            CREATE TABLE project_message_issues (
                message_id          UUID            NOT NULL REFERENCES project_messages(id) ON DELETE CASCADE,
                issue_id            UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
                PRIMARY KEY (message_id, issue_id)
            );
        SQL);
        DB::statement('CREATE INDEX project_message_issues_issue_idx ON project_message_issues (issue_id);');
    }

    public function down(): void
    {
        Schema::dropIfExists('project_message_issues');
        DB::statement('DROP POLICY IF EXISTS project_messages_workspace_isolation ON project_messages;');
        Schema::dropIfExists('project_messages');
    }
};
