<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE team_members (
                team_id             UUID            NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role                team_member_role NOT NULL DEFAULT 'member',
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                PRIMARY KEY (team_id, user_id)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('team_members');
    }
};
