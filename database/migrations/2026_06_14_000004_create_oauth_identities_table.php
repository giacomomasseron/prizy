<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE oauth_identities (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                provider            VARCHAR(32)     NOT NULL,
                provider_user_id    VARCHAR(255)    NOT NULL,
                access_token        TEXT,
                refresh_token       TEXT,
                token_expires_at    TIMESTAMPTZ,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                UNIQUE (provider, provider_user_id)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('oauth_identities');
    }
};
