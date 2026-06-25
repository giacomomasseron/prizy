<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE tags (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                name                VARCHAR(64)     NOT NULL,
                color               CHAR(7)         NOT NULL DEFAULT '#94a3b8',
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                UNIQUE (workspace_id, name)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('tags');
    }
};
