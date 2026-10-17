<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// The migrate step runs tenancy:check-database before migrating, so a database
// that would switch workspace isolation off stops the deploy instead. The dev
// and CI Postgres has a superuser, prizy/secret (docker-compose.yml), which
// stands in for an external server set up with the wrong role.

/** A connection like the default one, with $overrides; returns its name. */
function checkDatabaseConnection(string $name, array $overrides): string
{
    config(["database.connections.{$name}" => array_merge(config('database.connections.pgsql'), $overrides)]);

    return $name;
}

/** [exit code, output] of tenancy:check-database with $options. */
function checkDatabaseRun(array $options = []): array
{
    $code = Artisan::call('tenancy:check-database', $options);

    return [$code, Artisan::output()];
}

afterEach(function (): void {
    DB::purge('check_superuser');
    DB::purge('check_nowhere');
});

it('passes on the app role, which owns every table', function (): void {
    [$code, $output] = checkDatabaseRun();

    expect($code)->toBe(0)
        ->and($output)->toContain('role prizy_app (no superuser, no BYPASSRLS)')
        ->and($output)->not->toContain('owner of all 0 table(s)');
});

it('refuses a superuser, which row-level security does not apply to', function (): void {
    [$code, $output] = checkDatabaseRun([
        '--database' => checkDatabaseConnection('check_superuser', ['username' => 'prizy', 'password' => 'secret']),
    ]);

    expect($code)->toBe(1)
        ->and($output)->toContain('The role prizy is a superuser');
});

it('refuses a table another role owns, naming it', function (): void {
    $super = DB::connection(checkDatabaseConnection('check_superuser', ['username' => 'prizy', 'password' => 'secret']));
    $super->statement('CREATE TABLE check_database_foreign (id int)');

    try {
        [$code, $output] = checkDatabaseRun();
    } finally {
        $super->statement('DROP TABLE check_database_foreign');
    }

    expect($code)->toBe(1)
        ->and($output)->toContain('1 table(s) in the public schema belong to another role than prizy_app')
        ->and($output)->toContain('check_database_foreign (owned by prizy)');
});

it('says where it looked when the server cannot be reached', function (): void {
    [$code, $output] = checkDatabaseRun([
        '--database' => checkDatabaseConnection('check_nowhere', ['host' => '127.0.0.1', 'port' => '1']),
    ]);

    expect($code)->toBe(1)
        ->and($output)->toContain('Cannot reach the database at 127.0.0.1:1, database prizy_test, as prizy_app');
});
