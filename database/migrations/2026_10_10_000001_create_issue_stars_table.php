<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Personal stars on issues (PRD §3.2.9). Private to the user; scoped through the issue — like
 * issue_labels and issue_comment_reactions, no workspace_id and no RLS of its own.
 */
return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE issue_stars (
                user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                issue_id            UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                PRIMARY KEY (user_id, issue_id)
            );
        SQL);
        DB::statement('CREATE INDEX issue_stars_issue_idx ON issue_stars (issue_id);');
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_stars');
    }
};
