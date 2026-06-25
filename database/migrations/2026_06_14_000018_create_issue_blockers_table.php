<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE issue_blockers (
                blocking_issue_id   UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
                blocked_issue_id    UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
                created_by          UUID            NOT NULL REFERENCES users(id),
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                PRIMARY KEY (blocking_issue_id, blocked_issue_id),
                CONSTRAINT issue_blockers_no_self CHECK (blocking_issue_id <> blocked_issue_id)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_blockers');
    }
};
