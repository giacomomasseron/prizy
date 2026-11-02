<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE teams (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                name                VARCHAR(255)    NOT NULL,
                identifier          VARCHAR(8)      NOT NULL,
                color               CHAR(7)         NOT NULL DEFAULT '#6366f1',
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                deleted_at          TIMESTAMPTZ,
                UNIQUE (workspace_id, identifier)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('teams');
    }
};
