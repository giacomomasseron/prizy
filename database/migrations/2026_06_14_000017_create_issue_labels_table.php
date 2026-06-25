<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE issue_labels (
                issue_id            UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
                label_id            UUID            NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
                PRIMARY KEY (issue_id, label_id)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_labels');
    }
};
