<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Refuses a database that would quietly switch workspace isolation off.
 *
 * Workspaces are kept apart by row-level security, which PostgreSQL skips
 * entirely for a superuser or a BYPASSRLS role. The app's role must also own
 * every table: migrations alter them, which only an owner can do, and the
 * policies are FORCEd so that owning a table does not exempt it. The bundled
 * database is set up that way; an external one is set up by hand, so the
 * migrate step runs this first and stops the deploy with the reason, rather
 * than serve one workspace's rows to another or fail half-way through an
 * upgrade.
 */
final class CheckDatabaseCommand extends Command
{
    protected $signature = 'tenancy:check-database
        {--database= : The connection to check (default: the default connection)}
        {--wait=0 : Seconds to keep retrying while the server cannot be reached}';

    protected $description = 'Check the database keeps workspaces apart: PostgreSQL 16+, a role that is no superuser, has no BYPASSRLS and owns every table.';

    private const MIN_SERVER_VERSION = 160000;

    public function handle(): int
    {
        $name = (string) ($this->option('database') ?: config('database.default'));
        $db = $this->connect($name, max(0, (int) $this->option('wait')));

        if ($db === null) {
            return self::FAILURE;
        }

        if ($db->getDriverName() !== 'pgsql') {
            $this->error("Prizy needs PostgreSQL; the [{$name}] connection uses {$db->getDriverName()}.");

            return self::FAILURE;
        }

        $role = $db->selectOne(
            'SELECT current_user AS name, rolsuper::int AS superuser, rolbypassrls::int AS bypassrls
             FROM pg_roles WHERE rolname = current_user',
        );
        $server = $db->selectOne(
            "SELECT current_setting('server_version_num')::int AS number, current_setting('server_version') AS version",
        );
        $tables = $db->select(
            "SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
        );
        $foreign = array_values(array_filter($tables, fn (object $table): bool => $table->tableowner !== $role->name));

        $problems = [];

        if ((int) $server->number < self::MIN_SERVER_VERSION) {
            $problems[] = "PostgreSQL {$server->version} is too old: Prizy needs 16 or newer.";
        }
        if ((int) $role->superuser === 1) {
            $problems[] = "The role {$role->name} is a superuser. PostgreSQL skips row-level security for superusers, "
                .'so every workspace would see every other workspace\'s data. Connect as a role without SUPERUSER '
                .'(scripts/create-database-role.sql creates one).';
        }
        if ((int) $role->bypassrls === 1) {
            $problems[] = "The role {$role->name} has BYPASSRLS, which switches row-level security off for it, "
                ."so every workspace would see every other workspace's data. Run ALTER ROLE {$role->name} NOBYPASSRLS as an administrator.";
        }
        if ($foreign !== []) {
            $first = $foreign[0];
            $problems[] = sprintf(
                '%d table(s) in the public schema belong to another role than %s, starting with %s (owned by %s). '
                .'Only a table\'s owner can alter it, so the next migration would fail on it. '
                .'Restore the data connected as %s with pg_restore --no-owner, or run ALTER TABLE ... OWNER TO %s for each.',
                count($foreign), $role->name, $first->tablename, $first->tableowner, $role->name, $role->name,
            );
        }

        foreach ($problems as $problem) {
            $this->error($problem);
        }
        if ($problems !== []) {
            return self::FAILURE;
        }

        $this->info(sprintf(
            'The database keeps workspaces apart: PostgreSQL %s, role %s (no superuser, no BYPASSRLS), owner of all %d table(s).',
            $server->version, $role->name, count($tables),
        ));

        return self::SUCCESS;
    }

    /** The open connection, or null once $wait seconds pass without reaching the server. */
    private function connect(string $name, int $wait): ?ConnectionInterface
    {
        $config = (array) config("database.connections.{$name}");
        $where = sprintf(
            '%s:%s, database %s, as %s',
            $config['host'] ?? '?', $config['port'] ?? '?', $config['database'] ?? '?', $config['username'] ?? '?',
        );
        $deadline = microtime(true) + $wait;
        $announced = false;

        while (true) {
            try {
                $db = DB::connection($name);
                $db->getPdo();

                return $db;
            } catch (Throwable $e) {
                DB::purge($name);

                if (microtime(true) >= $deadline) {
                    $this->error("Cannot reach the database at {$where}: {$e->getMessage()}");

                    return null;
                }
                if (! $announced) {
                    $this->line("Waiting up to {$wait}s for the database at {$where} ({$e->getMessage()})");
                    $announced = true;
                }
                sleep(1);
            }
        }
    }
}
