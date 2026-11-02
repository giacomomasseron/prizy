<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('helpdesk_saved_views', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name');
            $table->uuid('created_by');
            $table->jsonb('definition');
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users');
            $table->index('workspace_id');
        });

        // Row Level Security — empty-GUC-safe policy form (GUC app.current_workspace_id).
        DB::statement('ALTER TABLE helpdesk_saved_views ENABLE ROW LEVEL SECURITY;');
        DB::statement('ALTER TABLE helpdesk_saved_views FORCE ROW LEVEL SECURITY;');
        DB::statement(
            'CREATE POLICY helpdesk_saved_views_workspace_isolation ON helpdesk_saved_views USING ('
            ."NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL "
            ."OR workspace_id::text = current_setting('app.current_workspace_id', true));"
        );
    }

    public function down(): void
    {
        DB::statement('DROP POLICY IF EXISTS helpdesk_saved_views_workspace_isolation ON helpdesk_saved_views;');
        Schema::dropIfExists('helpdesk_saved_views');
    }
};
