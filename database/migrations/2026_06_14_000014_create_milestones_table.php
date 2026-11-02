<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE milestones (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id          UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                name                VARCHAR(255)    NOT NULL,
                target_date         DATE            NOT NULL,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('milestones');
    }
};
