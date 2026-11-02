<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE sla_breaches (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                ticket_id           UUID            NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                metric              VARCHAR(32)     NOT NULL,   -- 'first_reply', 'next_reply', 'resolution'
                breached_at         TIMESTAMPTZ     NOT NULL,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                UNIQUE (ticket_id, metric)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('sla_breaches');
    }
};
