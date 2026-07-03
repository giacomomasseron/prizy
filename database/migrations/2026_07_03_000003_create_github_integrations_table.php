<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('github_integrations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('webhook_token', 64)->unique();
            $table->text('webhook_secret')->nullable();
            $table->boolean('move_to_done_on_merge')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->unique('workspace_id');
        });

        DB::statement('ALTER TABLE github_integrations ENABLE ROW LEVEL SECURITY;');
        DB::statement('ALTER TABLE github_integrations FORCE ROW LEVEL SECURITY;');
        DB::statement(
            "CREATE POLICY github_integrations_workspace_isolation ON github_integrations USING ("
            . "NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL "
            . "OR workspace_id::text = current_setting('app.current_workspace_id', true));"
        );
    }

    public function down(): void
    {
        DB::statement('DROP POLICY IF EXISTS github_integrations_workspace_isolation ON github_integrations;');
        Schema::dropIfExists('github_integrations');
    }
};
