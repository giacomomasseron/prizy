<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE issue_comments (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                issue_id            UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
                user_id             UUID            NOT NULL REFERENCES users(id),
                body                TEXT            NOT NULL,
                is_internal         BOOLEAN         NOT NULL DEFAULT FALSE,
                edited_at           TIMESTAMPTZ,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                deleted_at          TIMESTAMPTZ
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_comments');
    }
};
