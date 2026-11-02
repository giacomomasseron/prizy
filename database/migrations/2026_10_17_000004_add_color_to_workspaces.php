<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // The workspace mark's colour, picked at sign-up (SignUpWorkspace::COLORS).
        // NULL for every workspace made before it, and for sign-ups that pick none.
        DB::statement('ALTER TABLE workspaces ADD COLUMN color VARCHAR(7);');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE workspaces DROP COLUMN IF EXISTS color;');
    }
};
