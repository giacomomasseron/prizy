<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE personal_access_tokens (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name                VARCHAR(255)    NOT NULL,
                token_hash          VARCHAR(64)     NOT NULL UNIQUE,
                last_used_at        TIMESTAMPTZ,
                expires_at          TIMESTAMPTZ,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
