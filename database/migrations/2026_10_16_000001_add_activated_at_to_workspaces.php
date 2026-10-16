<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // NULL = pending: signed up with SIGNUP_REQUIRES_ACTIVATION on and not
        // yet confirmed by its owner. The DEFAULT fills every existing row and
        // every insert that does not ask for pending, so nothing already live
        // (and no seeder or factory) goes dark.
        DB::statement('ALTER TABLE workspaces ADD COLUMN activated_at TIMESTAMPTZ DEFAULT now();');
        // workspaces:prune-pending scans only the pending rows, by age.
        DB::statement('CREATE INDEX workspaces_pending_created_at_idx ON workspaces (created_at) WHERE activated_at IS NULL;');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS workspaces_pending_created_at_idx;');
        DB::statement('ALTER TABLE workspaces DROP COLUMN IF EXISTS activated_at;');
    }
};
