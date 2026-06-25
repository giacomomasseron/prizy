<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

it('creates the KB, bridge, and notification tables', function (): void {
    foreach ([
        'kb_categories', 'kb_sections', 'kb_articles', 'kb_article_versions',
        'kb_article_translations', 'issue_ticket_links', 'notifications',
    ] as $table) {
        expect(Schema::hasTable($table))->toBeTrue("missing table {$table}");
    }
});

it('creates the expected indexes', function (): void {
    $indexes = collect(DB::select("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"))
        ->pluck('indexname');
    foreach (['idx_issues_workspace', 'idx_tickets_status', 'idx_notifications_user'] as $idx) {
        expect($indexes)->toContain($idx);
    }
});

it('enables row-level security on workspace-scoped tables', function (): void {
    $rlsTables = collect(DB::select('SELECT relname FROM pg_class WHERE relrowsecurity = true'))
        ->pluck('relname');
    foreach (['issues', 'tickets', 'users', 'notifications'] as $table) {
        expect($rlsTables)->toContain($table);
    }
});
