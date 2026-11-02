<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE ticket_tags (
                ticket_id           UUID            NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                tag_id              UUID            NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY (ticket_id, tag_id)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_tags');
    }
};
