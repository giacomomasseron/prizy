<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * PostgreSQL defines ordering operators (<, >, =, ...) for the uuid type but, unlike
 * numeric/text/timestamp types, ships no built-in MIN()/MAX() aggregate for it.
 *
 * Laravel's HasOne::ofMany()/latestOfMany() always appends a MAX(<primary key>) tiebreaker
 * aggregate to guarantee a single deterministic row per group (see
 * CanBeOneOfMany::ofMany()). The moment such a relation is defined on a table whose
 * primary key is a uuid — e.g. Ticket::latestPublicMessage() over TicketMessage — every
 * query (lazy or eager-loaded) fails with:
 *   SQLSTATE[42883]: Undefined function: 7 ERROR:  function max(uuid) does not exist
 *
 * Fix: register MAX(uuid)/MIN(uuid) aggregates backed by GREATEST/LEAST, which already
 * work on uuid via its standard comparison operators and share the NULL-skipping
 * semantics a SQL aggregate needs (return NULL only when every input is NULL).
 */
return new class extends Migration
{
    public function up(): void
    {
        // migrate:fresh (used between test runs by RefreshDatabase) wipes tables but not
        // aggregates/functions, so drop first to keep this migration idempotent.
        $this->drop();

        DB::unprepared(<<<'SQL'
            CREATE FUNCTION uuid_greatest(uuid, uuid) RETURNS uuid AS $$
                SELECT GREATEST($1, $2);
            $$ LANGUAGE SQL IMMUTABLE;

            CREATE AGGREGATE max(uuid) (
                SFUNC = uuid_greatest,
                STYPE = uuid
            );

            CREATE FUNCTION uuid_least(uuid, uuid) RETURNS uuid AS $$
                SELECT LEAST($1, $2);
            $$ LANGUAGE SQL IMMUTABLE;

            CREATE AGGREGATE min(uuid) (
                SFUNC = uuid_least,
                STYPE = uuid
            );
            SQL);
    }

    public function down(): void
    {
        $this->drop();
    }

    private function drop(): void
    {
        DB::unprepared(<<<'SQL'
            DROP AGGREGATE IF EXISTS max(uuid);
            DROP AGGREGATE IF EXISTS min(uuid);
            DROP FUNCTION IF EXISTS uuid_greatest(uuid, uuid);
            DROP FUNCTION IF EXISTS uuid_least(uuid, uuid);
            SQL);
    }
};
