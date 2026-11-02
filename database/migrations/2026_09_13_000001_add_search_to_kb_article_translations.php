<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Gives translations their own full-text index, with each row indexed under its
 * OWN language's stemmer rather than English.
 *
 * The CASE duplicates App\Services\KbLocales::REGCONFIGS because a generated
 * expression cannot call PHP — KbLocalesTest asserts the two never drift. Only
 * the two-argument to_tsvector(regconfig, text) form is immutable, which is
 * what makes it legal in a generated column; the one-argument form is not.
 * Weights match kb_articles.search: title A, body B.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            ALTER TABLE kb_article_translations ADD COLUMN search tsvector
            GENERATED ALWAYS AS (
                setweight(to_tsvector(
                    CASE locale
                        WHEN 'fr' THEN 'french'::regconfig
                        WHEN 'de' THEN 'german'::regconfig
                        WHEN 'es' THEN 'spanish'::regconfig
                        WHEN 'it' THEN 'italian'::regconfig
                        WHEN 'pt-BR' THEN 'portuguese'::regconfig
                        ELSE 'simple'::regconfig
                    END, coalesce(title, '')), 'A') ||
                setweight(to_tsvector(
                    CASE locale
                        WHEN 'fr' THEN 'french'::regconfig
                        WHEN 'de' THEN 'german'::regconfig
                        WHEN 'es' THEN 'spanish'::regconfig
                        WHEN 'it' THEN 'italian'::regconfig
                        WHEN 'pt-BR' THEN 'portuguese'::regconfig
                        ELSE 'simple'::regconfig
                    END, coalesce(body, '')), 'B')
            ) STORED
        SQL);

        DB::statement('CREATE INDEX idx_kb_article_translations_search ON kb_article_translations USING GIN (search);');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_kb_article_translations_search;');
        DB::statement('ALTER TABLE kb_article_translations DROP COLUMN IF EXISTS search;');
    }
};
