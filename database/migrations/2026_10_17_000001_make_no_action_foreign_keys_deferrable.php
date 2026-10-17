<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Deleting a workspace is one DELETE that cascades through every table. The
 * foreign keys with no ON DELETE rule (issues.created_by, kb_articles.author_id
 * and the like, all pointing at users) are checked while that cascade is still
 * running: a user's row can be gone before the comments and articles that name
 * them, which go a step later, through their issue or category. Deferrable,
 * those checks wait until DeleteWorkspace asks for them, once nothing is left.
 *
 * INITIALLY IMMEDIATE, so every other statement checks them exactly as before.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->alter(deferrable: false, to: 'DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(): void
    {
        $this->alter(deferrable: true, to: 'NOT DEFERRABLE');
    }

    private function alter(bool $deferrable, string $to): void
    {
        $which = $deferrable ? 'c.condeferrable' : 'NOT c.condeferrable';

        // confdeltype 'a' is NO ACTION, the default for a key with no ON DELETE.
        $statements = DB::select(<<<SQL
            SELECT format('ALTER TABLE %s ALTER CONSTRAINT %I {$to}', c.conrelid::regclass, c.conname) AS sql
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE c.contype = 'f' AND c.confdeltype = 'a' AND {$which}
              AND n.nspname = current_schema()
            ORDER BY 1
        SQL);

        foreach ($statements as $statement) {
            DB::statement($statement->sql);
        }
    }
};
