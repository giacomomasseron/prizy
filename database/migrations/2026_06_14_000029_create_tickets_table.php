<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE tickets (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                requester_id        UUID            NOT NULL REFERENCES contacts(id),
                assignee_id         UUID            REFERENCES users(id) ON DELETE SET NULL,
                agent_group_id      UUID            REFERENCES agent_groups(id) ON DELETE SET NULL,
                sla_policy_id       UUID            REFERENCES sla_policies(id) ON DELETE SET NULL,
                subject             VARCHAR(255)    NOT NULL,
                status              ticket_status   NOT NULL DEFAULT 'new',
                priority            ticket_priority NOT NULL DEFAULT 'normal',
                channel             ticket_channel  NOT NULL,
                csat_rating         csat_rating,
                csat_responded_at   TIMESTAMPTZ,
                first_replied_at    TIMESTAMPTZ,
                resolved_at         TIMESTAMPTZ,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                deleted_at          TIMESTAMPTZ
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
