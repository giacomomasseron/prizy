<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('issue_github_links', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('issue_id');
            $table->string('repo');
            $table->integer('number');
            $table->string('url', 2048);
            $table->text('title')->nullable();
            $table->string('state')->default('open');
            $table->string('source')->default('manual');
            $table->uuid('created_by');
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('issue_id')->references('id')->on('issues')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users');
            $table->unique(['issue_id', 'url']);
            $table->index(['workspace_id', 'repo', 'number']);
        });

        DB::statement('ALTER TABLE issue_github_links ENABLE ROW LEVEL SECURITY;');
        DB::statement('ALTER TABLE issue_github_links FORCE ROW LEVEL SECURITY;');
        DB::statement(
            "CREATE POLICY issue_github_links_workspace_isolation ON issue_github_links USING ("
            . "NULLIF(current_setting('app.current_workspace_id', true), '') IS NULL "
            . "OR workspace_id::text = current_setting('app.current_workspace_id', true));"
        );
    }

    public function down(): void
    {
        DB::statement('DROP POLICY IF EXISTS issue_github_links_workspace_isolation ON issue_github_links;');
        Schema::dropIfExists('issue_github_links');
    }
};
