<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE notification_preferences (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                event_type          VARCHAR(32)     NOT NULL,   -- 'mention', 'assign', 'comment', 'status', 'unblocked'
                channel             VARCHAR(16)     NOT NULL,   -- 'in_app', 'email'
                enabled             BOOLEAN         NOT NULL,
                UNIQUE(user_id, event_type, channel)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};
