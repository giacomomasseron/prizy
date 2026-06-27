<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement('ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;');
        DB::statement('ALTER TABLE invitations FORCE ROW LEVEL SECURITY;');
        DB::statement(
            "CREATE POLICY invitations_workspace_isolation ON invitations USING ("
            . "current_setting('app.current_workspace_id', true) IS NULL OR "
            . "current_setting('app.current_workspace_id', true) = '' OR "
            . "workspace_id = current_setting('app.current_workspace_id', true)::uuid);"
        );
    }

    public function down(): void
    {
        DB::statement('DROP POLICY IF EXISTS invitations_workspace_isolation ON invitations;');
        DB::statement('ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;');
    }
};
