<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE ticket_ccs (
                ticket_id           UUID            NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                contact_id          UUID            NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
                PRIMARY KEY (ticket_id, contact_id)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_ccs');
    }
};
