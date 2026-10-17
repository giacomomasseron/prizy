<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Deleting a row makes PostgreSQL look up every row that references it, once
 * per deleted row: a cascade, a SET NULL or a deferred check. On a foreign key
 * column no index leads, each lookup reads the whole table, every workspace's
 * rows included, so deleting a large workspace (thousands of contacts, each
 * checked against ticket_messages) would take hours. This indexes every such
 * column.
 *
 * CONCURRENTLY, so a live install keeps writing while the indexes build; that
 * cannot run in a transaction.
 */
return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        foreach ($this->unindexedForeignKeyColumns() as $key) {
            DB::statement(sprintf('CREATE INDEX CONCURRENTLY IF NOT EXISTS %s ON %s (%s)', $this->indexName($key), $key->tbl, $key->col));
        }
    }

    public function down(): void
    {
        $names = DB::select(<<<'SQL'
            SELECT quote_ident(c.relname) AS name
            FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'i' AND n.nspname = current_schema() AND c.relname LIKE '%\_fkey\_index'
        SQL);

        foreach ($names as $index) {
            DB::statement("DROP INDEX CONCURRENTLY IF EXISTS {$index->name}");
        }
    }

    /** @return list<object{tbl: string, col: string, raw_tbl: string, raw_col: string}> */
    private function unindexedForeignKeyColumns(): array
    {
        return DB::select(<<<'SQL'
            SELECT DISTINCT c.conrelid::regclass::text AS tbl, quote_ident(a.attname) AS col,
                   cl.relname AS raw_tbl, a.attname AS raw_col
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            JOIN pg_class cl ON cl.oid = c.conrelid
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
            WHERE c.contype = 'f' AND n.nspname = current_schema()
              AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1])
            ORDER BY 1, 2
        SQL);
    }

    private function indexName(object $key): string
    {
        return '"'.substr("{$key->raw_tbl}_{$key->raw_col}_fkey_index", 0, 63).'"';
    }
};
