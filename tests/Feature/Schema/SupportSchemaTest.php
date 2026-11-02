<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schema;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

it('creates the customer-support tables', function (): void {
    foreach ([
        'contacts', 'contact_metadata', 'agent_groups', 'agent_group_members',
        'business_hour_schedules', 'business_hour_intervals', 'sla_policies',
        'tags', 'tickets', 'ticket_ccs', 'ticket_tags', 'ticket_messages',
        'ticket_attachments', 'sla_breaches', 'macros', 'macro_actions',
        'automations', 'automation_conditions', 'automation_actions',
    ] as $table) {
        expect(Schema::hasTable($table))->toBeTrue("missing table {$table}");
    }
});
