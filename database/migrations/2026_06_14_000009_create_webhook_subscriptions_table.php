<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE webhook_subscriptions (
                webhook_id          UUID            NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
                event               webhook_event   NOT NULL,
                PRIMARY KEY (webhook_id, event)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_subscriptions');
    }
};
