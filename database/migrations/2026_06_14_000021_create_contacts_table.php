<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE contacts (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                name                VARCHAR(255)    NOT NULL,
                email               CITEXT          NOT NULL,
                phone               VARCHAR(32),
                external_id         VARCHAR(255),               -- your product's user ID
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                deleted_at          TIMESTAMPTZ,
                UNIQUE (workspace_id, email),
                UNIQUE (workspace_id, external_id)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
