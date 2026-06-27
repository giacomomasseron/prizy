<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Replace the original RLS workspace isolation policies on all tenant tables.
 *
 * Problem: the original policy uses `current_setting(...)::uuid` which PostgreSQL may
 * evaluate even when an earlier OR branch is already true (evaluation order is not
 * guaranteed). When the GUC is set to '' (empty string — as done by forgetCurrent()
 * for landlord routes), casting '' to uuid raises:
 *   ERROR:  invalid input syntax for type uuid: ""
 *
 * Fix: replace the uuid-cast comparison with a text comparison so that the GUC value
 * is never cast to uuid.  The first OR branch handles null/empty GUC (permissive for
 * landlord routes); the second branch restricts to the active workspace.
 *
 * New policy expression:
 *   NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL
 *   OR workspace_id::text = current_setting('app.current_workspace_id', true)
 */
return new class extends Migration {
    /** @var list<string> */
    private array $tenantTables = [
        'users', 'teams', 'webhooks', 'labels', 'projects', 'issues',
        'contacts', 'agent_groups', 'business_hour_schedules', 'sla_policies',
        'tags', 'tickets', 'macros', 'automations', 'kb_categories', 'notifications',
        'invitations',
    ];

    public function up(): void
    {
        foreach ($this->tenantTables as $table) {
            DB::statement("DROP POLICY IF EXISTS {$table}_workspace_isolation ON {$table};");
            DB::statement(
                "CREATE POLICY {$table}_workspace_isolation ON {$table} USING ("
                . "NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL "
                . "OR workspace_id::text = current_setting('app.current_workspace_id', true));"
            );
        }
    }

    public function down(): void
    {
        foreach ($this->tenantTables as $table) {
            DB::statement("DROP POLICY IF EXISTS {$table}_workspace_isolation ON {$table};");
            DB::statement(
                "CREATE POLICY {$table}_workspace_isolation ON {$table} USING ("
                . "current_setting('app.current_workspace_id', true) IS NULL OR "
                . "current_setting('app.current_workspace_id', true) = '' OR "
                . "workspace_id = current_setting('app.current_workspace_id', true)::uuid);"
            );
        }
    }
};
