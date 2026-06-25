<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
            DO $$
            DECLARE
                tenant_table TEXT;
            BEGIN
                FOREACH tenant_table IN ARRAY ARRAY[
                    'users', 'teams', 'webhooks', 'labels', 'projects', 'issues',
                    'contacts', 'agent_groups', 'business_hour_schedules', 'sla_policies',
                    'tags', 'tickets', 'macros', 'automations', 'kb_categories', 'notifications'
                ]
                LOOP
                    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tenant_table);
                    EXECUTE format('ALTER TABLE %I FORCE  ROW LEVEL SECURITY;', tenant_table);
                    EXECUTE format(
                        'CREATE POLICY %1$s_workspace_isolation ON %1$I USING ('
                        || 'current_setting(''app.current_workspace_id'', true) IS NULL OR '
                        || 'current_setting(''app.current_workspace_id'', true) = '''' OR '
                        || 'workspace_id = current_setting(''app.current_workspace_id'', true)::uuid);',
                        tenant_table
                    );
                END LOOP;
            END $$;
        SQL);
    }

    public function down(): void
    {
        foreach ([
            'users','teams','webhooks','labels','projects','issues','contacts',
            'agent_groups','business_hour_schedules','sla_policies','tags','tickets',
            'macros','automations','kb_categories','notifications',
        ] as $t) {
            DB::statement("DROP POLICY IF EXISTS {$t}_workspace_isolation ON {$t};");
            DB::statement("ALTER TABLE {$t} DISABLE ROW LEVEL SECURITY;");
        }
    }
};
