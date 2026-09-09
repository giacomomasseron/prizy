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
        Schema::create('releases', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->date('target_date')->nullable();
            $table->timestampTz('shipped_at')->nullable();
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->index('workspace_id');
        });

        // Row Level Security — empty-GUC-safe policy form (GUC app.current_workspace_id).
        DB::statement('ALTER TABLE releases ENABLE ROW LEVEL SECURITY;');
        DB::statement('ALTER TABLE releases FORCE ROW LEVEL SECURITY;');
        DB::statement(
            'CREATE POLICY releases_workspace_isolation ON releases USING ('
            ."NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL "
            ."OR workspace_id::text = current_setting('app.current_workspace_id', true));"
        );

        DB::statement('ALTER TABLE issues ADD COLUMN release_id UUID NULL REFERENCES releases(id) ON DELETE SET NULL;');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE issues DROP COLUMN IF EXISTS release_id;');
        DB::statement('DROP POLICY IF EXISTS releases_workspace_isolation ON releases;');
        Schema::dropIfExists('releases');
    }
};
