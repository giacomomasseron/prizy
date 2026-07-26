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
    identifier?: string;
    labels?: { id: string; name: string; color: string }[];
    assignee?: { id: string; name: string } | null;
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
    email_digest_frequency: 'off' | 'daily' | 'weekly';
}

export type ProjectStatus = 'planning' | 'in_progress' | 'paused' | 'completed' | 'cancelled';

export interface Team {
    id: string;
    name: string;
    identifier: string;
    color: string;
    member_count?: number;
    lead?: { id: string; name: string } | null;
    created_at: string;
    updated_at: string;
}

export interface Project {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    color: string;
    status: ProjectStatus;
    team_id: string | null;
    start_date: string | null;
    target_date: string | null;
    lead_id: string | null;
    priority: IssuePriority;
    created_by: string;
    created_at: string;
    updated_at: string;
    lead?: { id: string; name: string } | null;
    issue_count?: number;
    progress?: number;
}

export interface Cycle {
    id: string;
    team_id: string;
    name: string;
    starts_at: string;
    ends_at: string;
    cooldown_days: number;
    description?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Milestone {
    id: string;
    project_id: string;
    name: string;
    target_date: string;
    created_at: string;
    updated_at: string;
}

export interface Label {
    id: string;
    name: string;
    color: string;
    group?: string | null;
    issue_count?: number;
    created_at: string;
    updated_at: string;
}

export interface SavedView {
    id: string;
    name: string;
    created_by: string;
    definition: {
        filter: Record<string, string>;
        sort: string;
        view_type: 'list' | 'board';
    };
    created_at: string;
    updated_at: string;
}

export interface AppNotification {
    id: string;
    type: string;
    subject_type: string;
    subject_id: string;
    read_at: string | null;
    created_at: string;
}

export interface SlackIntegration {
    configured: boolean;
    is_active: boolean;
    events: string[];
    url_preview: string | null;
}

export interface SearchResults {
    issues: Issue[];
    projects: { id: string; name: string }[];
    teams: { id: string; name: string; identifier: string }[];
}

export interface RoadmapProject {
    id: string;
    name: string;
    color: string;
    status: ProjectStatus;
    team_id: string | null;
    start_date: string | null;
    target_date: string | null;
    created_at: string;
    updated_at: string;
    milestones: Array<{ id: string; name: string; target_date: string }>;
    lead?: { id: string; name: string } | null;
    issue_count?: number;
    progress?: number;
}

export interface GithubIntegration {
    configured: boolean;
    is_active: boolean;
    move_to_done_on_merge: boolean;
    webhook_url: string | null;
    secret_set: boolean;
}

export interface GithubLink {
    id: string;
    repo: string;
    number: number;
    url: string;
    title: string | null;
    state: 'open' | 'merged' | 'closed';
}

export type TicketStatus = 'new' | 'open' | 'pending' | 'on_hold' | 'solved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketChannel = 'email' | 'chat' | 'portal' | 'api';

export interface TicketListItem {
    id: string;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    channel: TicketChannel;
    requester: { id: string; name: string; email: string; org: string | null; plan: string | null } | null;
    assignee: { id: string; name: string } | null;
    tags: { name: string; color: string }[];
    linked_issues: { id: string; identifier?: string; title: string }[];
    sla: { policy_name: string | null; breached: boolean };
    updated_at: string;
    created_at: string;
    first_replied_at: string | null;
    resolved_at: string | null;
}

export interface TicketMessage {
    id: string;
    kind: 'customer' | 'agent' | 'note';
    sender: { name: string | null };
    body: string;
    created_at: string;
}

export interface TicketDetail extends TicketListItem {
    messages: TicketMessage[];
    requester_history: { id: string; subject: string; status: TicketStatus }[];
}
