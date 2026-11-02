<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Default TRUE so every existing workspace keeps the tracker it already uses.
        DB::statement('ALTER TABLE workspaces ADD COLUMN tracker_enabled BOOLEAN NOT NULL DEFAULT TRUE;');
        // A workspace with both modules off would have nothing left to open.
        // UpdateWorkspaceSettings refuses it with a readable message; this is
        // the backstop for every other writer.
        DB::statement('ALTER TABLE workspaces ADD CONSTRAINT workspaces_one_module_on CHECK (tracker_enabled OR helpdesk_enabled);');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_one_module_on;');
        DB::statement('ALTER TABLE workspaces DROP COLUMN IF EXISTS tracker_enabled;');
    }
};
