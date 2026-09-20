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
    release_id?: string | null;
    parent_issue_id: string | null;
    assignee_id: string | null;
    created_by: string;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
    identifier?: string;
    labels?: { id: string; name: string; color: string }[];
    assignee?: { id: string; name: string } | null;
    project?: { id: string; name: string; color: string } | null;
    cycle?: { id: string; name: string } | null;
    release?: { id: string; name: string; shipped_at: string | null } | null;
    support_ticket?: { id: string; ref: string; subject: string; customer: string | null; plan: string | null } | null;
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
    reactions: { emoji: string; count: number; reacted: boolean }[];
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
    /**
     * Workspace-level module switches. Present on /v1/me; the login, magic-link,
     * sign-up and accept-invite payloads are also typed Me and do NOT carry it,
     * so every reader must treat it as possibly absent.
     */
    workspace?: { helpdesk_enabled: boolean };
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

export interface ReleaseRollup {
    total: number;
    done: number;
    cancelled: number;
    pct: number | null;
}

export interface Release {
    id: string;
    name: string;
    description: string | null;
    target_date: string | null;
    shipped_at: string | null;
    created_at: string;
    rollup: ReleaseRollup;
}

export interface ReleaseIssueRow {
    id: string;
    ref: string;
    title: string;
    status: IssueStatus;
    assignee: { id: string; name: string } | null;
}

export interface ReleaseDetail extends Release {
    by_status: { key: string; count: number }[];
    issues: ReleaseIssueRow[];
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
    actor?: { id: string; name: string } | null;
    body?: string | null;
    subject?: { type: string; id: string; ref: string; title: string; path: string } | null;
    snoozed_until?: string | null;
    archived_at?: string | null;
}

export interface NotificationPreferences {
    email_digest_frequency: string;
    preferences: { event_type: string; in_app: boolean; email: boolean }[];
}

export interface NotificationSubscription {
    scope_type: string;
    scope_id: string;
    level: string;
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

export interface SlaMetric {
    metric: 'first_reply' | 'next_reply' | 'resolution';
    policy_name: string | null;
    target_minutes: number;
    due_at: string | null;
    state: 'none' | 'met' | 'due' | 'breached';
    remaining_minutes: number;
    within_business_hours: boolean;
}

export interface TicketListItem {
    id: string;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    channel: TicketChannel;
    requester: { id: string; name: string; email: string; org: string | null; plan: string | null } | null;
    assignee: { id: string; name: string } | null;
    tags: { id: string; name: string; color: string }[];
    linked_issues: { id: string; identifier?: string; title: string }[];
    sla_metrics: SlaMetric[];
    updated_at: string;
    created_at: string;
    first_replied_at: string | null;
    resolved_at: string | null;
    csat_rating?: 'thumbs_up' | 'thumbs_down' | null;
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

export interface ContactOption {
    id: string;
    name: string;
    email: string;
    org: string | null;
    plan: string | null;
}

export interface NewTicketInput {
    subject: string;
    requester_id: string;
    priority: TicketPriority;
    channel: TicketChannel;
    body: string;
}

export interface TicketCounts {
    by_status: Record<TicketStatus, number>;
    by_channel: Record<TicketChannel, number>;
    unassigned: number;
    mine_unsolved: number;
}

export interface Kpi {
    value: number | null;
    delta_pct: number | null;
}

export interface VolumeBucket {
    label: string;
    created: number;
    solved: number;
}

export interface OverviewReport {
    range: '7d' | '30d' | '90d';
    kpis: {
        tickets_created: Kpi;
        solved: Kpi;
        median_first_reply_minutes: Kpi;
        csat: Kpi;
    };
    volume: VolumeBucket[];
    sparklines?: {
        tickets_created: (number | null)[];
        solved: (number | null)[];
        median_first_reply_minutes: (number | null)[];
        csat: (number | null)[];
    };
    by_status: Record<TicketStatus, number>;
    escalations: {
        count: number;
        created_total: number;
        rate_pct: number;
        recent: { ticket_id: string; subject: string; issue_id: string | null }[];
    };
}

export interface AgentRow {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    assigned: number;
    solved: number;
    median_first_reply_minutes: number | null;
    median_resolution_minutes: number | null;
    csat_pct: number | null;
    csat_responses: number;
}

export interface RepliesBucket {
    label: string;
    count: number;
}

export interface CsatBreakdownRow {
    key: 'positive' | 'negative';
    label: string;
    count: number;
    pct: number;
}

export interface AgentsReport {
    range: '7d' | '30d' | '90d';
    agents: AgentRow[];
    replies_per_day: RepliesBucket[];
    csat: {
        responses: number;
        positive_pct: number | null;
        breakdown: CsatBreakdownRow[];
    };
}

export interface SlaPlanRow {
    policy_id: string;
    name: string;
    target_minutes: number;
    attainment_pct: number | null;
    count: number;
}

export interface ChannelCount {
    channel: TicketChannel;
    count: number;
}

export interface BreachRiskRow {
    ticket_id: string;
    subject: string;
    requester_name: string | null;
    target_minutes: number | null;
    remaining_minutes: number;
    pct: number;
}

export interface TagCount {
    name: string;
    count: number;
}

export interface SlaReport {
    range: '7d' | '30d' | '90d';
    attainment_pct: number | null;
    resolution_attainment_pct: number | null;
    by_plan: SlaPlanRow[];
    by_channel: ChannelCount[];
    breach_risk: BreachRiskRow[];
    tags: TagCount[];
}

export interface ScheduleInterval {
    day_of_week: number; // 0=Sun..6=Sat
    opens_at: string; // 'HH:MM'
    closes_at: string; // 'HH:MM'
}

export interface Schedule {
    id: string;
    name: string;
    timezone: string;
    intervals: ScheduleInterval[];
}

export interface SlaPolicy {
    id: string;
    name: string;
    first_reply_minutes: number;
    next_reply_minutes: number | null;
    resolution_minutes: number;
    schedule_id: string | null;
    schedule_name: string | null;
}

export interface HelpdeskSavedView {
    id: string;
    name: string;
    created_by: string;
    definition: { filter: Record<string, string>; sort: string };
    created_at: string;
    updated_at: string;
}

export interface HelpdeskSavedReport {
    id: string;
    name: string;
    created_by: string;
    definition: { section: 'overview' | 'agents' | 'sla'; range: '7d' | '30d' | '90d' };
    created_at: string;
    updated_at: string;
}

export interface TrackerOverviewReport {
    kpis: { created: Kpi; completed: Kpi; active: Kpi; median_cycle_time_minutes: Kpi };
    sparklines: { created: (number | null)[]; completed: (number | null)[] };
    flow: { labels: string[]; created: number[]; completed: number[] };
    by_status: { key: string; count: number }[];
    by_priority: { key: string; count: number }[];
}

export interface VelocityRow {
    id: string;
    name: string;
    starts_at: string;
    ends_at: string;
    completed_count: number;
    total_count: number;
}

export interface BurndownDay {
    date: string;
    remaining: number | null;
}

export interface CycleReport {
    cycles: VelocityRow[];
    burndown: {
        cycle_id: string;
        name: string;
        starts_at: string;
        ends_at: string;
        total_scope: number;
        days: BurndownDay[];
    } | null;
}
