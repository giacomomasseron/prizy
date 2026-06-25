<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE workspaces (
                id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                name          VARCHAR(255)    NOT NULL,
                slug          VARCHAR(63)     NOT NULL UNIQUE,
                custom_domain VARCHAR(253)    UNIQUE,
                logo_url      VARCHAR(2048),
                plan          workspace_plan  NOT NULL DEFAULT 'starter',
                timezone      VARCHAR(64)     NOT NULL DEFAULT 'UTC',
                locale        VARCHAR(10)     NOT NULL DEFAULT 'en',
                created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
                deleted_at    TIMESTAMPTZ
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('workspaces');
    }
};
