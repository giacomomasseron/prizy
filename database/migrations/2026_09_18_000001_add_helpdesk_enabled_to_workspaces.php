<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Default TRUE so every existing workspace keeps the helpdesk it already uses.
        DB::statement('ALTER TABLE workspaces ADD COLUMN helpdesk_enabled BOOLEAN NOT NULL DEFAULT TRUE;');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE workspaces DROP COLUMN IF EXISTS helpdesk_enabled;');
    }
};
