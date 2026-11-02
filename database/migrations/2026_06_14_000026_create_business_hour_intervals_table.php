<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE business_hour_intervals (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                schedule_id         UUID            NOT NULL REFERENCES business_hour_schedules(id) ON DELETE CASCADE,
                day_of_week         SMALLINT        NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
                opens_at            TIME            NOT NULL,
                closes_at           TIME            NOT NULL,
                CONSTRAINT bhi_times_check CHECK (closes_at > opens_at)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('business_hour_intervals');
    }
};
