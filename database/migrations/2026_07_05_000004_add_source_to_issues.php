<?php
declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE issues ADD COLUMN source VARCHAR(16) NOT NULL DEFAULT 'native'");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE issues DROP COLUMN IF EXISTS source');
    }
};
