<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE users (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                name                VARCHAR(255)    NOT NULL,
                email               CITEXT          NOT NULL,
                email_verified_at   TIMESTAMPTZ,
                password_hash       VARCHAR(255),
                admin_level         admin_level     NOT NULL DEFAULT 'member',
                is_developer        BOOLEAN         NOT NULL DEFAULT FALSE,
                is_agent            BOOLEAN         NOT NULL DEFAULT FALSE,
                avatar_url          VARCHAR(2048),
                timezone            VARCHAR(64)     NOT NULL DEFAULT 'UTC',
                locale              VARCHAR(10)     NOT NULL DEFAULT 'en',
                last_seen_at        TIMESTAMPTZ,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                deleted_at          TIMESTAMPTZ,
                UNIQUE (workspace_id, email)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
