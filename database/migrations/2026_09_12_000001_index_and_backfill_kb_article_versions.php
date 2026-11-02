<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * HC-5 brings kb_article_versions into use. No new columns — two changes:
 *  - an index for the only query shape this table has (one article's versions,
 *    newest first); it shipped with nothing beyond its primary key;
 *  - a backfill so every pre-HC-5 article owns a version mirroring its current
 *    state, which is the invariant the feature rests on (the newest version
 *    always equals the article).
 *
 * RLS note: this table is FORCE ROW LEVEL SECURITY, but its policy is
 * empty-GUC-safe — with no `app.current_workspace_id` set, as during a
 * migration, the predicate short-circuits to true and every row is visible.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE INDEX IF NOT EXISTS idx_kb_article_versions_article ON kb_article_versions(article_id, created_at DESC);');

        // Idempotent: only articles with no versions at all receive a row.
        DB::statement(<<<'SQL'
            INSERT INTO kb_article_versions (id, article_id, author_id, title, body, created_at)
            SELECT gen_random_uuid(), a.id, a.author_id, a.title, a.body, a.created_at
            FROM kb_articles a
            WHERE NOT EXISTS (SELECT 1 FROM kb_article_versions v WHERE v.article_id = a.id)
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_kb_article_versions_article;');
        // Backfilled rows are user content now — a rollback must not delete history.
    }
};
