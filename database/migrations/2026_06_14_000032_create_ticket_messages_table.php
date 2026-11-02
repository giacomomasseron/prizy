<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE ticket_messages (
                id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                ticket_id           UUID            NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                sender_type         sender_type     NOT NULL,
                sender_user_id      UUID            REFERENCES users(id) ON DELETE SET NULL,
                sender_contact_id   UUID            REFERENCES contacts(id) ON DELETE SET NULL,
                body                TEXT            NOT NULL,
                is_internal         BOOLEAN         NOT NULL DEFAULT FALSE,   -- agent-only note
                channel             ticket_channel  NOT NULL,
                created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
                deleted_at          TIMESTAMPTZ,
                CONSTRAINT ticket_messages_sender_check CHECK (
                    (sender_type = 'user'    AND sender_user_id    IS NOT NULL AND sender_contact_id IS NULL) OR
                    (sender_type = 'contact' AND sender_contact_id IS NOT NULL AND sender_user_id    IS NULL)
                )
            );
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_messages');
    }
};
