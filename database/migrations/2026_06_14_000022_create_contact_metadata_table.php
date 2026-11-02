<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE contact_metadata (
                contact_id          UUID            NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
                key                 VARCHAR(128)    NOT NULL,
                value               TEXT            NOT NULL,
                PRIMARY KEY (contact_id, key)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_metadata');
    }
};
