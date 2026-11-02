<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE kb_article_versions (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                article_id          UUID            NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
                author_id           UUID            NOT NULL REFERENCES users(id),
                title               VARCHAR(255)    NOT NULL,
                body                TEXT            NOT NULL,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('kb_article_versions');
    }
};
