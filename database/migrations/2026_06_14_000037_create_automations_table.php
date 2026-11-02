<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE automations (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                created_by          UUID            NOT NULL REFERENCES users(id),
                name                VARCHAR(255)    NOT NULL,
                trigger_event       VARCHAR(64)     NOT NULL,   -- 'ticket.created', 'sla.breached', ...
                is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('automations');
    }
};
