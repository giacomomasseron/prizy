<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE issue_ticket_links (
                issue_id            UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
                ticket_id           UUID            NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                created_by          UUID            NOT NULL REFERENCES users(id),
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                PRIMARY KEY (issue_id, ticket_id)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_ticket_links');
    }
};
