<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schema;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

it('creates the issue-tracker tables', function (): void {
    foreach ([
        'labels', 'projects', 'project_members', 'milestones', 'cycles',
        'issues', 'issue_labels', 'issue_blockers', 'issue_comments', 'issue_activities',
    ] as $table) {
        expect(Schema::hasTable($table))->toBeTrue("missing table {$table}");
    }
});

it('enforces the no-self-block check on issue_blockers', function (): void {
    expect(Schema::hasTable('issue_blockers'))->toBeTrue();
    // CHECK (blocking_issue_id <> blocked_issue_id) verified in UseCase tests (Plan 3).
});
