<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// PurgeWorkspace is a single DELETE on workspaces. These hold the schema to
// what that relies on, so a new table cannot quietly survive a deletion, or
// make one fail.

/** @return list<object{child: string, parent: string, column: string, on_delete: string, deferrable: bool, not_null: bool}> */
function deletionSchemaForeignKeys(): array
{
    return DB::select(<<<'SQL'
        SELECT c.conrelid::regclass::text AS child, c.confrelid::regclass::text AS parent,
               a.attname AS column, c.confdeltype AS on_delete, c.condeferrable AS deferrable, a.attnotnull AS not_null
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
        WHERE c.contype = 'f' AND n.nspname = current_schema()
        ORDER BY 1, 3
    SQL);
}

it('cascades every foreign key that points at workspaces', function (): void {
    $notCascading = array_values(array_map(
        fn (object $fk): string => "{$fk->child}.{$fk->column}",
        array_filter(deletionSchemaForeignKeys(), fn (object $fk): bool => $fk->parent === 'workspaces' && $fk->on_delete !== 'c'),
    ));

    expect($notCascading)->toBe([]);
});

it('gives every workspace_id column a foreign key to workspaces', function (): void {
    $columns = array_column(DB::select(<<<'SQL'
        SELECT c.table_name FROM information_schema.columns c
        JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = current_schema() AND c.column_name = 'workspace_id' AND t.table_type = 'BASE TABLE'
        ORDER BY 1
    SQL), 'table_name');
    $keyed = array_map(
        fn (object $fk): string => $fk->child,
        array_filter(deletionSchemaForeignKeys(), fn (object $fk): bool => $fk->parent === 'workspaces' && $fk->column === 'workspace_id'),
    );

    expect(array_values(array_diff($columns, $keyed)))->toBe([]);
});

// A key with no ON DELETE rule is checked while the cascade still runs, maybe
// before the rows that would satisfy it are gone; deferrable, PurgeWorkspace
// checks it once the cascade is done.
it('cascades, nulls or defers every foreign key', function (): void {
    $blocking = array_values(array_map(
        fn (object $fk): string => "{$fk->child}.{$fk->column} → {$fk->parent}",
        array_filter(deletionSchemaForeignKeys(), fn (object $fk): bool => ! in_array($fk->on_delete, ['c', 'n'], true) && ! $fk->deferrable),
    ));

    expect($blocking)->toBe([]);
});

// A key that nulls its column acts during the cascade, and neither NOT NULL nor
// a CHECK constraint can wait for the row to be deleted after it.
it('nulls only columns that may be null and that no check constraint reads', function (): void {
    // issues_no_self_parent is parent_issue_id <> id, which a NULL passes.
    $harmless = ['issues_no_self_parent'];
    $checked = [];
    foreach (DB::select(<<<'SQL'
        SELECT c.conrelid::regclass::text AS child, a.attname AS column, c.conname AS name
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.contype = 'c' AND n.nspname = current_schema()
    SQL) as $check) {
        if (! in_array($check->name, $harmless, true)) {
            $checked["{$check->child}.{$check->column}"] = $check->name;
        }
    }

    $clashes = [];
    foreach (deletionSchemaForeignKeys() as $fk) {
        $column = "{$fk->child}.{$fk->column}";
        if ($fk->on_delete === 'n' && ($fk->not_null || isset($checked[$column]))) {
            $clashes[] = $column.($fk->not_null ? ' (NOT NULL)' : " ({$checked[$column]})");
        }
    }

    expect($clashes)->toBe([]);
});

// Every deleted row is looked up in each table that references it; without an
// index on the referencing column, each lookup reads that whole table.
it('indexes every foreign key column', function (): void {
    $unindexed = array_column(DB::select(<<<'SQL'
        SELECT c.conrelid::regclass::text || '.' || a.attname AS key
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
        WHERE c.contype = 'f' AND n.nspname = current_schema()
          AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1])
        ORDER BY 1
    SQL), 'key');

    expect($unindexed)->toBe([]);
});

it('reaches every table but the framework ones from workspaces through cascading keys', function (): void {
    $reached = ['workspaces' => true];
    do {
        $grew = false;
        foreach (deletionSchemaForeignKeys() as $fk) {
            if ($fk->on_delete === 'c' && isset($reached[$fk->parent]) && ! isset($reached[$fk->child])) {
                $reached[$fk->child] = true;
                $grew = true;
            }
        }
    } while ($grew);

    $tables = array_column(DB::select('SELECT tablename FROM pg_tables WHERE schemaname = current_schema() ORDER BY 1'), 'tablename');
    $framework = ['cache', 'cache_locks', 'failed_jobs', 'job_batches', 'jobs', 'migrations'];

    expect(array_values(array_diff($tables, array_keys($reached), $framework)))->toBe([]);
});
