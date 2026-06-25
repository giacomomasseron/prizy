<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE projects (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                team_id             UUID            REFERENCES teams(id) ON DELETE SET NULL,
                name                VARCHAR(255)    NOT NULL,
                description         TEXT,
                icon                VARCHAR(64),
                color               CHAR(7)         NOT NULL DEFAULT '#6366f1',
                status              project_status  NOT NULL DEFAULT 'planning',
                start_date          DATE,
                target_date         DATE,
                created_by          UUID            NOT NULL REFERENCES users(id),
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                deleted_at          TIMESTAMPTZ
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
