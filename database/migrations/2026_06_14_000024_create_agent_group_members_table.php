<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE agent_group_members (
                agent_group_id      UUID            NOT NULL REFERENCES agent_groups(id) ON DELETE CASCADE,
                user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                PRIMARY KEY (agent_group_id, user_id)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_group_members');
    }
};
