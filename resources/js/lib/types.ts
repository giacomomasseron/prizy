export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type IssuePriority = 'no_priority' | 'urgent' | 'high' | 'medium' | 'low';

export interface Issue {
    id: string;
    title: string;
    description: string | null;
    status: IssueStatus;
    priority: IssuePriority;
    estimate: number | null;
    due_date: string | null;
    sort_order: number;
    team_id: string;
    project_id: string | null;
    cycle_id: string | null;
    parent_issue_id: string | null;
    assignee_id: string | null;
    created_by: string;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface IssueComment {
    id: string;
    issue_id: string;
    user_id: string;
    body: string;
    is_internal: boolean;
    edited_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface IssueActivity {
    id: string;
    issue_id: string;
    user_id: string | null;
    type: string;
    from_value: string | null;
    to_value: string | null;
    created_at: string;
}

export interface Me {
    id: string;
    workspace_id: string;
    name: string;
    email: string;
    admin_level: string;
    is_developer: boolean;
    is_agent: boolean;
}
