<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE macros (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                created_by          UUID            NOT NULL REFERENCES users(id),
                name                VARCHAR(255)    NOT NULL,
                body                TEXT            NOT NULL,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('macros');
    }
};
