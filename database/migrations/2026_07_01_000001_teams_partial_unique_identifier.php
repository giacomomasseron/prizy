<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Drop the full unique constraint so soft-deleted identifiers can be reused.
        DB::statement('ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_workspace_id_identifier_key;');

        // Partial unique index: only active (non-deleted) rows must be unique per workspace.
        DB::statement('CREATE UNIQUE INDEX teams_workspace_id_identifier_active_uidx ON teams (workspace_id, identifier) WHERE deleted_at IS NULL;');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS teams_workspace_id_identifier_active_uidx;');
        DB::statement('ALTER TABLE teams ADD CONSTRAINT teams_workspace_id_identifier_key UNIQUE (workspace_id, identifier);');
    }
};
