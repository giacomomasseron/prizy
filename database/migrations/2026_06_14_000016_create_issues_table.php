<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE issues (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                team_id             UUID            NOT NULL REFERENCES teams(id),
                project_id          UUID            REFERENCES projects(id) ON DELETE SET NULL,
                cycle_id            UUID            REFERENCES cycles(id) ON DELETE SET NULL,
                parent_issue_id     UUID            REFERENCES issues(id) ON DELETE SET NULL,
                assignee_id         UUID            REFERENCES users(id) ON DELETE SET NULL,
                created_by          UUID            NOT NULL REFERENCES users(id),
                title               VARCHAR(255)    NOT NULL,
                description         TEXT,
                status              issue_status    NOT NULL DEFAULT 'backlog',
                priority            issue_priority  NOT NULL DEFAULT 'no_priority',
                estimate            SMALLINT,
                due_date            DATE,
                sort_order          DOUBLE PRECISION NOT NULL DEFAULT 0,
                archived_at         TIMESTAMPTZ,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                deleted_at          TIMESTAMPTZ,
                CONSTRAINT issues_no_self_parent CHECK (parent_issue_id <> id)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('issues');
    }
};
