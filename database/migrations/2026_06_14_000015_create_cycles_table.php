<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE cycles (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                team_id             UUID            NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                name                VARCHAR(255)    NOT NULL,
                starts_at           DATE            NOT NULL,
                ends_at             DATE            NOT NULL,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                CONSTRAINT cycles_dates_check CHECK (ends_at > starts_at)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('cycles');
    }
};
