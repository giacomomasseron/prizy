<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE issue_comment_reactions (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                issue_comment_id    UUID            NOT NULL REFERENCES issue_comments(id) ON DELETE CASCADE,
                user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                emoji               VARCHAR(16)     NOT NULL,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                UNIQUE (issue_comment_id, user_id, emoji)
            );
        SQL);
        DB::statement('CREATE INDEX issue_comment_reactions_comment_idx ON issue_comment_reactions (issue_comment_id);');
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_comment_reactions');
    }
};
