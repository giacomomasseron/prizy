<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Mockup topic-card fields.
        DB::statement(<<<'SQL'
            ALTER TABLE kb_categories
                ADD COLUMN description TEXT NULL,
                ADD COLUMN icon VARCHAR(16) NULL,
                ADD COLUMN color VARCHAR(32) NULL;
        SQL);

        // Full-text search: generated column (title weight A, body weight B) + GIN.
        DB::statement(<<<'SQL'
            ALTER TABLE kb_articles ADD COLUMN search tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(body, '')), 'B')
                ) STORED;
        SQL);
        DB::statement('CREATE INDEX idx_kb_articles_search ON kb_articles USING GIN (search);');

        // RLS — a Phase-1 gap: kb_categories already got RLS from
        // 2026_06_14_000051 (and the empty-GUC fix in 2026_06_27_000001), but
        // kb_sections/kb_articles/kb_article_versions/kb_article_translations
        // never did. Categories carry workspace_id directly (house form);
        // children resolve through their parent chain with EXISTS
        // (empty-GUC-safe like every other policy). Because kb_categories'
        // policy already exists, every CREATE POLICY below is preceded by a
        // DROP POLICY IF EXISTS, matching the house pattern in
        // 2026_06_27_000001_fix_rls_policies_empty_guc.php.
        DB::statement('ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;');
        DB::statement('ALTER TABLE kb_categories FORCE ROW LEVEL SECURITY;');
        DB::statement('DROP POLICY IF EXISTS kb_categories_workspace_isolation ON kb_categories;');
        DB::statement(
            'CREATE POLICY kb_categories_workspace_isolation ON kb_categories USING ('
            ."NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL "
            ."OR workspace_id::text = current_setting('app.current_workspace_id', true));"
        );

        DB::statement('ALTER TABLE kb_sections ENABLE ROW LEVEL SECURITY;');
        DB::statement('ALTER TABLE kb_sections FORCE ROW LEVEL SECURITY;');
        DB::statement('DROP POLICY IF EXISTS kb_sections_workspace_isolation ON kb_sections;');
        DB::statement(
            'CREATE POLICY kb_sections_workspace_isolation ON kb_sections USING ('
            ."NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL "
            .'OR EXISTS (SELECT 1 FROM kb_categories c WHERE c.id = kb_sections.category_id '
            ."AND c.workspace_id::text = current_setting('app.current_workspace_id', true)));"
        );

        DB::statement('ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;');
        DB::statement('ALTER TABLE kb_articles FORCE ROW LEVEL SECURITY;');
        DB::statement('DROP POLICY IF EXISTS kb_articles_workspace_isolation ON kb_articles;');
        DB::statement(
            'CREATE POLICY kb_articles_workspace_isolation ON kb_articles USING ('
            ."NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL "
            .'OR EXISTS (SELECT 1 FROM kb_sections s JOIN kb_categories c ON c.id = s.category_id '
            .'WHERE s.id = kb_articles.section_id '
            ."AND c.workspace_id::text = current_setting('app.current_workspace_id', true)));"
        );

        DB::statement('ALTER TABLE kb_article_versions ENABLE ROW LEVEL SECURITY;');
        DB::statement('ALTER TABLE kb_article_versions FORCE ROW LEVEL SECURITY;');
        DB::statement('DROP POLICY IF EXISTS kb_article_versions_workspace_isolation ON kb_article_versions;');
        DB::statement(
            'CREATE POLICY kb_article_versions_workspace_isolation ON kb_article_versions USING ('
            ."NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL "
            .'OR EXISTS (SELECT 1 FROM kb_articles a JOIN kb_sections s ON s.id = a.section_id '
            .'JOIN kb_categories c ON c.id = s.category_id WHERE a.id = kb_article_versions.article_id '
            ."AND c.workspace_id::text = current_setting('app.current_workspace_id', true)));"
        );

        DB::statement('ALTER TABLE kb_article_translations ENABLE ROW LEVEL SECURITY;');
        DB::statement('ALTER TABLE kb_article_translations FORCE ROW LEVEL SECURITY;');
        DB::statement('DROP POLICY IF EXISTS kb_article_translations_workspace_isolation ON kb_article_translations;');
        DB::statement(
            'CREATE POLICY kb_article_translations_workspace_isolation ON kb_article_translations USING ('
            ."NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL "
            .'OR EXISTS (SELECT 1 FROM kb_articles a JOIN kb_sections s ON s.id = a.section_id '
            .'JOIN kb_categories c ON c.id = s.category_id WHERE a.id = kb_article_translations.article_id '
            ."AND c.workspace_id::text = current_setting('app.current_workspace_id', true)));"
        );
    }

    public function down(): void
    {
        // kb_categories is deliberately excluded: its RLS + policy predate
        // this migration (Phase-1's 2026_06_14_000051, refreshed by
        // 2026_06_27_000001) and up() only re-created the byte-identical
        // policy there (required because CREATE POLICY has no IF NOT EXISTS
        // and one already existed) — no net change to tear down. Rolling
        // back must leave kb_categories' Phase-1 protection untouched.
        foreach (['kb_article_translations', 'kb_article_versions', 'kb_articles', 'kb_sections'] as $t) {
            DB::statement("DROP POLICY IF EXISTS {$t}_workspace_isolation ON {$t};");
            DB::statement("ALTER TABLE {$t} NO FORCE ROW LEVEL SECURITY;");
            DB::statement("ALTER TABLE {$t} DISABLE ROW LEVEL SECURITY;");
        }
        DB::statement('DROP INDEX IF EXISTS idx_kb_articles_search;');
        DB::statement('ALTER TABLE kb_articles DROP COLUMN IF EXISTS search;');
        DB::statement('ALTER TABLE kb_categories DROP COLUMN IF EXISTS description, DROP COLUMN IF EXISTS icon, DROP COLUMN IF EXISTS color;');
    }
};
