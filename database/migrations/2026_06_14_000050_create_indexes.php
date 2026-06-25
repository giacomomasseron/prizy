<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Workspace lookups
        DB::statement('CREATE INDEX idx_users_workspace           ON users(workspace_id);');
        DB::statement('CREATE INDEX idx_users_email               ON users(email);');
        DB::statement('CREATE INDEX idx_teams_workspace           ON teams(workspace_id);');

        // Issue tracker
        DB::statement('CREATE INDEX idx_issues_workspace          ON issues(workspace_id);');
        DB::statement('CREATE INDEX idx_issues_team               ON issues(team_id);');
        DB::statement('CREATE INDEX idx_issues_project            ON issues(project_id);');
        DB::statement('CREATE INDEX idx_issues_cycle              ON issues(cycle_id);');
        DB::statement('CREATE INDEX idx_issues_assignee           ON issues(assignee_id);');
        DB::statement('CREATE INDEX idx_issues_status             ON issues(status);');
        DB::statement('CREATE INDEX idx_issues_parent             ON issues(parent_issue_id);');
        DB::statement('CREATE INDEX idx_issue_blockers_blocked    ON issue_blockers(blocked_issue_id);');
        DB::statement('CREATE INDEX idx_issue_activities_issue    ON issue_activities(issue_id);');
        DB::statement('CREATE INDEX idx_issue_comments_issue      ON issue_comments(issue_id);');

        // Support
        DB::statement('CREATE INDEX idx_tickets_workspace         ON tickets(workspace_id);');
        DB::statement('CREATE INDEX idx_tickets_requester         ON tickets(requester_id);');
        DB::statement('CREATE INDEX idx_tickets_assignee          ON tickets(assignee_id);');
        DB::statement('CREATE INDEX idx_tickets_status            ON tickets(status);');
        DB::statement('CREATE INDEX idx_tickets_channel           ON tickets(channel);');
        DB::statement('CREATE INDEX idx_ticket_messages_ticket    ON ticket_messages(ticket_id);');
        DB::statement('CREATE INDEX idx_contacts_workspace        ON contacts(workspace_id);');
        DB::statement('CREATE INDEX idx_contacts_email            ON contacts(email);');

        // Knowledge base
        DB::statement('CREATE INDEX idx_kb_articles_section       ON kb_articles(section_id);');
        DB::statement('CREATE INDEX idx_kb_articles_status        ON kb_articles(status);');

        // Notifications
        DB::statement('CREATE INDEX idx_notifications_user        ON notifications(user_id, read_at);');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_users_workspace;');
        DB::statement('DROP INDEX IF EXISTS idx_users_email;');
        DB::statement('DROP INDEX IF EXISTS idx_teams_workspace;');
        DB::statement('DROP INDEX IF EXISTS idx_issues_workspace;');
        DB::statement('DROP INDEX IF EXISTS idx_issues_team;');
        DB::statement('DROP INDEX IF EXISTS idx_issues_project;');
        DB::statement('DROP INDEX IF EXISTS idx_issues_cycle;');
        DB::statement('DROP INDEX IF EXISTS idx_issues_assignee;');
        DB::statement('DROP INDEX IF EXISTS idx_issues_status;');
        DB::statement('DROP INDEX IF EXISTS idx_issues_parent;');
        DB::statement('DROP INDEX IF EXISTS idx_issue_blockers_blocked;');
        DB::statement('DROP INDEX IF EXISTS idx_issue_activities_issue;');
        DB::statement('DROP INDEX IF EXISTS idx_issue_comments_issue;');
        DB::statement('DROP INDEX IF EXISTS idx_tickets_workspace;');
        DB::statement('DROP INDEX IF EXISTS idx_tickets_requester;');
        DB::statement('DROP INDEX IF EXISTS idx_tickets_assignee;');
        DB::statement('DROP INDEX IF EXISTS idx_tickets_status;');
        DB::statement('DROP INDEX IF EXISTS idx_tickets_channel;');
        DB::statement('DROP INDEX IF EXISTS idx_ticket_messages_ticket;');
        DB::statement('DROP INDEX IF EXISTS idx_contacts_workspace;');
        DB::statement('DROP INDEX IF EXISTS idx_contacts_email;');
        DB::statement('DROP INDEX IF EXISTS idx_kb_articles_section;');
        DB::statement('DROP INDEX IF EXISTS idx_kb_articles_status;');
        DB::statement('DROP INDEX IF EXISTS idx_notifications_user;');
    }
};
