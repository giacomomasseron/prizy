<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE kb_categories (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                name                VARCHAR(255)    NOT NULL,
                slug                VARCHAR(255)    NOT NULL,
                position            SMALLINT        NOT NULL DEFAULT 0,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                UNIQUE (workspace_id, slug)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('kb_categories');
    }
};
