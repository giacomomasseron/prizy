<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("CREATE UNIQUE INDEX team_members_one_lead_per_team ON team_members (team_id) WHERE role = 'lead'");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS team_members_one_lead_per_team');
    }
};
