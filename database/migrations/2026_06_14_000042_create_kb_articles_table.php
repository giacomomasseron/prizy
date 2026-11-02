<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE kb_articles (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                section_id          UUID            NOT NULL REFERENCES kb_sections(id) ON DELETE CASCADE,
                author_id           UUID            NOT NULL REFERENCES users(id),
                title               VARCHAR(255)    NOT NULL,
                slug                VARCHAR(255)    NOT NULL,
                body                TEXT            NOT NULL,
                status              article_status  NOT NULL DEFAULT 'draft',
                position            SMALLINT        NOT NULL DEFAULT 0,
                views_count         INTEGER         NOT NULL DEFAULT 0,
                helpful_count       INTEGER         NOT NULL DEFAULT 0,
                unhelpful_count     INTEGER         NOT NULL DEFAULT 0,
                published_at        TIMESTAMPTZ,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                deleted_at          TIMESTAMPTZ,
                UNIQUE (section_id, slug)
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('kb_articles');
    }
};
