<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE invitations (
                id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id  UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                email         CITEXT          NOT NULL,
                admin_level   admin_level     NOT NULL DEFAULT 'member',
                is_developer  BOOLEAN         NOT NULL DEFAULT FALSE,
                is_agent      BOOLEAN         NOT NULL DEFAULT FALSE,
                token_hash    VARCHAR(64)     NOT NULL UNIQUE,
                invited_by    UUID            NOT NULL REFERENCES users(id),
                expires_at    TIMESTAMPTZ     NOT NULL,
                accepted_at   TIMESTAMPTZ,
                created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
            );
        SQL);

        DB::statement(
            'CREATE UNIQUE INDEX idx_invitations_pending ON invitations (workspace_id, email) WHERE accepted_at IS NULL;'
        );

        DB::statement(
            'CREATE INDEX idx_invitations_workspace ON invitations (workspace_id);'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('invitations');
    }
};
