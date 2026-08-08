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
            CREATE TABLE notification_subscriptions (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                scope_type          VARCHAR(16)     NOT NULL,   -- 'team', 'project'
                scope_id            UUID            NOT NULL,
                level               VARCHAR(16)     NOT NULL,   -- 'all', 'mentions', 'off'
                UNIQUE(user_id, scope_type, scope_id)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_subscriptions');
    }
};
