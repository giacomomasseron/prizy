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

    protected $description = 'Check the database suits Prizy: PostgreSQL 16+, and a role that is no superuser, has no BYPASSRLS and owns every table.';

    private const MIN_SERVER_VERSION = 160000;

    /**
     * Errors the server itself sent back: it is up, and waiting will not
     * change its answer. Anything else (refused, unresolvable, timed out) may
     * be a server still starting, or a container not created yet. A server
     * set to answer in another language just gets the full wait.
     */
    private const REFUSALS = '/password authentication failed|no pg_hba\.conf entry|(database|role) "[^"]*" does not exist/';

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
        // Tables an extension owns (PostGIS's spatial_ref_sys) are not Prizy's
        // and no migration touches them.
        $tables = $db->select(
            "SELECT c.relname AS tablename, pg_get_userbyid(c.relowner) AS tableowner
             FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
               AND NOT EXISTS (
                   SELECT 1 FROM pg_depend d
                   WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e'
               )
             ORDER BY c.relname",
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
                '%d table(s) in the public schema belong to a role other than %s, starting with %s (owned by %s). '
                .'Only a table\'s owner can alter it, so a migration that changes one would fail. '
                .'If they came from a restore, restore again connected as %s with pg_restore --no-owner, or run '
                .'ALTER TABLE ... OWNER TO %s for each. If they are not Prizy\'s, move them out of the public schema.',
                count($foreign), $role->name, $first->tablename, $first->tableowner, $role->name, $role->name,
            );
        }

        foreach ($problems as $problem) {
            $this->error($problem);
        }
        if ($problems !== []) {
            return self::FAILURE;
        }

        $config = (array) config("database.connections.{$name}");
        $this->info(sprintf(
            'Database check passed: PostgreSQL %s at %s:%s, role %s (no superuser, no BYPASSRLS), owner of all %d table(s).',
            $server->version, $config['host'] ?? '?', $config['port'] ?? '?', $role->name, count($tables),
        ));

        return self::SUCCESS;
    }

    /** The open connection, or null when the server refuses it or $wait seconds pass without one. */
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

                if (preg_match(self::REFUSALS, $e->getMessage()) === 1) {
                    $this->error("The database at {$where} refused the connection: {$e->getMessage()}");

                    return null;
                }
                if (microtime(true) >= $deadline) {
                    $this->error("Could not connect to the database at {$where}: {$e->getMessage()}");

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
