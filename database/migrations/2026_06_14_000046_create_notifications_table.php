<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE notifications (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type                VARCHAR(64)     NOT NULL,   -- 'issue_assigned', 'ticket_replied', ...
                subject_type        VARCHAR(64)     NOT NULL,   -- 'issue', 'ticket', 'comment'
                subject_id          UUID            NOT NULL,
                read_at             TIMESTAMPTZ,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
