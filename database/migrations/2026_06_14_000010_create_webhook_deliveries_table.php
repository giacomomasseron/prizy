<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE webhook_deliveries (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                webhook_id          UUID            NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
                event               webhook_event   NOT NULL,
                payload             JSONB           NOT NULL,
                http_status         SMALLINT,
                attempt             SMALLINT        NOT NULL DEFAULT 1,
                delivered_at        TIMESTAMPTZ,
                next_retry_at       TIMESTAMPTZ,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_deliveries');
    }
};
