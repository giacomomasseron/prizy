<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * A message's sender keys nulled themselves when their user or contact was
 * deleted, but ticket_messages_sender_check requires the sender a message
 * names, so the nulling could only ever fail. Deleting a workspace hit it: its
 * users go before the messages they sent, which follow through their ticket.
 *
 * As NO ACTION keys they are deferrable, like every other key that names a
 * user, so DeleteWorkspace checks them once the messages are gone. Deleting a
 * sender while their messages remain fails as before, on the key now.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['sender_user_id' => 'users', 'sender_contact_id' => 'contacts'] as $column => $table) {
            DB::statement("ALTER TABLE ticket_messages DROP CONSTRAINT ticket_messages_{$column}_fkey,
                ADD CONSTRAINT ticket_messages_{$column}_fkey FOREIGN KEY ({$column}) REFERENCES {$table}(id)
                DEFERRABLE INITIALLY IMMEDIATE");
        }
    }

    public function down(): void
    {
        foreach (['sender_user_id' => 'users', 'sender_contact_id' => 'contacts'] as $column => $table) {
            DB::statement("ALTER TABLE ticket_messages DROP CONSTRAINT ticket_messages_{$column}_fkey,
                ADD CONSTRAINT ticket_messages_{$column}_fkey FOREIGN KEY ({$column}) REFERENCES {$table}(id)
                ON DELETE SET NULL");
        }
    }
};
