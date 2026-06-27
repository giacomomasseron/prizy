-- =============================================================================
-- Prizy — Database Schema
-- PostgreSQL 16 · Third Normal Form (3NF)
-- =============================================================================
-- Conventions:
--   · All PKs are UUIDs (gen_random_uuid()).
--   · All tables carry created_at / updated_at.
--   · Soft-delete via deleted_at where applicable.
--   · Every tenant-scoped table has workspace_id NOT NULL → workspaces(id).
--   · Enum types are declared once and reused.
--   · No computed or derived data stored (3NF: no transitive dependencies).
--   · Junction tables have no surrogate PK — composite PK from FK pair.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive text (emails)

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

CREATE TYPE admin_level AS ENUM (
    'owner',
    'admin',
    'member',
    'viewer'
);

CREATE TYPE issue_status AS ENUM (
    'backlog',
    'todo',
    'in_progress',
    'in_review',
    'done',
    'cancelled'
);

CREATE TYPE issue_priority AS ENUM (
    'no_priority',
    'urgent',
    'high',
    'medium',
    'low'
);

CREATE TYPE project_status AS ENUM (
    'planning',
    'in_progress',
    'paused',
    'completed',
    'cancelled'
);

CREATE TYPE ticket_status AS ENUM (
    'new',
    'open',
    'pending',
    'on_hold',
    'solved',
    'closed'
);

CREATE TYPE ticket_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);

CREATE TYPE ticket_channel AS ENUM (
    'email',
    'chat',
    'portal',
    'api'
);

CREATE TYPE article_status AS ENUM (
    'draft',
    'published',
    'archived'
);

CREATE TYPE csat_rating AS ENUM (
    'thumbs_up',
    'thumbs_down'
);

CREATE TYPE sender_type AS ENUM (
    'user',    -- agent or member
    'contact'  -- customer
);

CREATE TYPE workspace_plan AS ENUM (
    'starter',
    'pro',
    'enterprise'
);

CREATE TYPE team_member_role AS ENUM (
    'lead',
    'member'
);

CREATE TYPE webhook_event AS ENUM (
    'issue.created',
    'issue.updated',
    'issue.status_changed',
    'issue.deleted',
    'ticket.created',
    'ticket.updated',
    'ticket.status_changed',
    'ticket.assigned',
    'ticket.resolved',
    'sla.breached'
);

-- =============================================================================
-- SECTION 1 — WORKSPACE LAYER
-- =============================================================================

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
-- One row per organization (tenant). All tenant data references this table.

CREATE TABLE workspaces (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255)    NOT NULL,
    slug                VARCHAR(63)     NOT NULL UNIQUE,     -- subdomain
    custom_domain       VARCHAR(253)    UNIQUE,              -- optional CNAME
    logo_url            VARCHAR(2048),                       -- workspace logo
    plan                workspace_plan  NOT NULL DEFAULT 'starter',
    timezone            VARCHAR(64)     NOT NULL DEFAULT 'UTC',
    locale              VARCHAR(10)     NOT NULL DEFAULT 'en',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- users
-- Workspace members. Customers are stored in contacts, not here.
-- ---------------------------------------------------------------------------
-- 3NF note: admin_level, is_developer, is_agent are all direct facts about
-- the user within the workspace. No transitive dependency.

CREATE TABLE users (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    email               CITEXT          NOT NULL,
    email_verified_at   TIMESTAMPTZ,
    password_hash       VARCHAR(255),                        -- null when using OAuth only
    admin_level         admin_level     NOT NULL DEFAULT 'member',
    is_developer        BOOLEAN         NOT NULL DEFAULT FALSE,
    is_agent            BOOLEAN         NOT NULL DEFAULT FALSE,
    avatar_url          VARCHAR(2048),
    timezone            VARCHAR(64)     NOT NULL DEFAULT 'UTC',
    locale              VARCHAR(10)     NOT NULL DEFAULT 'en',
    last_seen_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    UNIQUE (workspace_id, email)
);

-- ---------------------------------------------------------------------------
-- oauth_identities
-- Separated from users to avoid repeating provider columns (3NF).
-- One user can have multiple OAuth providers.
-- ---------------------------------------------------------------------------

CREATE TABLE oauth_identities (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(32)     NOT NULL,   -- 'google', 'github'
    provider_user_id    VARCHAR(255)    NOT NULL,
    access_token        TEXT,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
);

-- ---------------------------------------------------------------------------
-- personal_access_tokens
-- API tokens for programmatic access.
-- ---------------------------------------------------------------------------

CREATE TABLE personal_access_tokens (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    token_hash          VARCHAR(64)     NOT NULL UNIQUE,
    last_used_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- teams
-- Sub-groups within a workspace (Frontend, Backend, Mobile, etc.).
-- ---------------------------------------------------------------------------

CREATE TABLE teams (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    identifier          VARCHAR(8)      NOT NULL,   -- short prefix, e.g. "ENG"
    color               CHAR(7)         NOT NULL DEFAULT '#6366f1',  -- hex color
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    UNIQUE (workspace_id, identifier)
);

-- ---------------------------------------------------------------------------
-- team_members
-- Junction: which users belong to which team, and in what role.
-- ---------------------------------------------------------------------------

CREATE TABLE team_members (
    team_id             UUID            NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role                team_member_role NOT NULL DEFAULT 'member',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, user_id)
);

-- ---------------------------------------------------------------------------
-- webhooks
-- Outbound webhook endpoints registered per workspace.
-- ---------------------------------------------------------------------------

CREATE TABLE webhooks (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    url                 VARCHAR(2048)   NOT NULL,
    secret_hash         VARCHAR(64)     NOT NULL,   -- HMAC-SHA256 signing secret (hashed)
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- webhook_subscriptions
-- Which events each webhook listens to (3NF: event list extracted to its
-- own table rather than stored as an array in webhooks).
-- ---------------------------------------------------------------------------

CREATE TABLE webhook_subscriptions (
    webhook_id          UUID            NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event               webhook_event   NOT NULL,
    PRIMARY KEY (webhook_id, event)
);

-- ---------------------------------------------------------------------------
-- webhook_deliveries
-- Log of every delivery attempt for auditing and retry tracking.
-- ---------------------------------------------------------------------------

CREATE TABLE webhook_deliveries (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id          UUID            NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event               webhook_event   NOT NULL,
    payload             JSONB           NOT NULL,
    http_status         SMALLINT,
    attempt             SMALLINT        NOT NULL DEFAULT 1,
    delivered_at        TIMESTAMPTZ,
    next_retry_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- =============================================================================
-- SECTION 2 — ISSUE TRACKER
-- =============================================================================

-- ---------------------------------------------------------------------------
-- labels
-- Reusable labels scoped to a workspace.
-- Separated from issues to avoid repeating name/color per issue (3NF).
-- ---------------------------------------------------------------------------

CREATE TABLE labels (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                VARCHAR(64)     NOT NULL,
    color               CHAR(7)         NOT NULL DEFAULT '#94a3b8',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, name)
);

-- ---------------------------------------------------------------------------
-- projects
-- Groupings of issues with a defined scope and timeline.
-- ---------------------------------------------------------------------------

CREATE TABLE projects (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    team_id             UUID            REFERENCES teams(id) ON DELETE SET NULL,
    name                VARCHAR(255)    NOT NULL,
    description         TEXT,
    icon                VARCHAR(64),
    color               CHAR(7)         NOT NULL DEFAULT '#6366f1',
    status              project_status  NOT NULL DEFAULT 'planning',
    start_date          DATE,
    target_date         DATE,
    created_by          UUID            NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- project_members
-- Projects can span multiple teams; explicit membership table.
-- ---------------------------------------------------------------------------

CREATE TABLE project_members (
    project_id          UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

-- ---------------------------------------------------------------------------
-- milestones
-- Milestone markers within a project timeline.
-- Extracted from projects to avoid repeating milestone data (3NF).
-- ---------------------------------------------------------------------------

CREATE TABLE milestones (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    target_date         DATE            NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- cycles
-- Fixed-duration sprint containers scoped to a team.
-- ---------------------------------------------------------------------------

CREATE TABLE cycles (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id             UUID            NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    starts_at           DATE            NOT NULL,
    ends_at             DATE            NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT cycles_dates_check CHECK (ends_at > starts_at)
);

-- ---------------------------------------------------------------------------
-- issues
-- Core entity of the tracker module.
-- ---------------------------------------------------------------------------
-- 3NF notes:
--   · estimate is a plain story-point integer; there is no separate
--     estimate_unit column or table — the value is atomic to the issue.
--   · sort_order is a direct property of the issue.
--   · No denormalised counters (comment_count etc.) — derived at query time.

CREATE TABLE issues (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    team_id             UUID            NOT NULL REFERENCES teams(id),
    project_id          UUID            REFERENCES projects(id) ON DELETE SET NULL,
    cycle_id            UUID            REFERENCES cycles(id) ON DELETE SET NULL,
    parent_issue_id     UUID            REFERENCES issues(id) ON DELETE SET NULL,
    assignee_id         UUID            REFERENCES users(id) ON DELETE SET NULL,
    created_by          UUID            NOT NULL REFERENCES users(id),
    title               VARCHAR(255)    NOT NULL,
    description         TEXT,
    status              issue_status    NOT NULL DEFAULT 'backlog',
    priority            issue_priority  NOT NULL DEFAULT 'no_priority',
    estimate            SMALLINT,                           -- story points
    due_date            DATE,
    sort_order          DOUBLE PRECISION NOT NULL DEFAULT 0,
    archived_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT issues_no_self_parent CHECK (parent_issue_id <> id)
);

-- ---------------------------------------------------------------------------
-- issue_labels
-- Junction: many-to-many between issues and labels.
-- ---------------------------------------------------------------------------

CREATE TABLE issue_labels (
    issue_id            UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id            UUID            NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, label_id)
);

-- ---------------------------------------------------------------------------
-- issue_blockers
-- Directed graph edge: blocking_issue_id blocks blocked_issue_id.
-- Cross-project within the same workspace.
-- Circular dependency prevention is enforced at the application layer
-- (ResolveBlockersOnIssueCompletedUseCase).
-- ---------------------------------------------------------------------------

CREATE TABLE issue_blockers (
    blocking_issue_id   UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    blocked_issue_id    UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    created_by          UUID            NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (blocking_issue_id, blocked_issue_id),
    CONSTRAINT issue_blockers_no_self CHECK (blocking_issue_id <> blocked_issue_id)
);

-- ---------------------------------------------------------------------------
-- issue_comments
-- Comments and internal notes on an issue.
-- ---------------------------------------------------------------------------

CREATE TABLE issue_comments (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id            UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES users(id),
    body                TEXT            NOT NULL,
    is_internal         BOOLEAN         NOT NULL DEFAULT FALSE,
    edited_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- issue_activities
-- Immutable audit log of every state change on an issue.
-- ---------------------------------------------------------------------------

CREATE TABLE issue_activities (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id            UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id             UUID            REFERENCES users(id) ON DELETE SET NULL,
    type                VARCHAR(64)     NOT NULL,   -- e.g. 'status_changed', 'assigned'
    from_value          TEXT,
    to_value            TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- =============================================================================
-- SECTION 3 — CUSTOMER SUPPORT
-- =============================================================================

-- ---------------------------------------------------------------------------
-- contacts
-- Customers (ticket requesters). Not workspace members.
-- ---------------------------------------------------------------------------

CREATE TABLE contacts (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    email               CITEXT          NOT NULL,
    phone               VARCHAR(32),
    external_id         VARCHAR(255),               -- your product's user ID
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    UNIQUE (workspace_id, email),
    UNIQUE (workspace_id, external_id)
);

-- ---------------------------------------------------------------------------
-- contact_metadata
-- Arbitrary key-value pairs about a contact (e.g. plan, country, MRR).
-- Extracted from contacts to keep contacts in 3NF (no repeating groups).
-- ---------------------------------------------------------------------------

CREATE TABLE contact_metadata (
    contact_id          UUID            NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    key                 VARCHAR(128)    NOT NULL,
    value               TEXT            NOT NULL,
    PRIMARY KEY (contact_id, key)
);

-- ---------------------------------------------------------------------------
-- agent_groups
-- Logical groupings of agents (e.g. Tier-1, Billing, Technical).
-- ---------------------------------------------------------------------------

CREATE TABLE agent_groups (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, name)
);

-- ---------------------------------------------------------------------------
-- agent_group_members
-- Junction: which users (agents) belong to which group.
-- ---------------------------------------------------------------------------

CREATE TABLE agent_group_members (
    agent_group_id      UUID            NOT NULL REFERENCES agent_groups(id) ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (agent_group_id, user_id)
);

-- ---------------------------------------------------------------------------
-- business_hour_schedules
-- Named schedules (e.g. "Mon–Fri 9–18 CET") reused across SLA policies.
-- Extracted so the schedule definition is not repeated per policy (3NF).
-- ---------------------------------------------------------------------------

CREATE TABLE business_hour_schedules (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    timezone            VARCHAR(64)     NOT NULL DEFAULT 'UTC',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- business_hour_intervals
-- Individual day-of-week windows within a schedule.
-- Separated from the schedule itself to avoid repeating groups (3NF).
-- ---------------------------------------------------------------------------

CREATE TABLE business_hour_intervals (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id         UUID            NOT NULL REFERENCES business_hour_schedules(id) ON DELETE CASCADE,
    day_of_week         SMALLINT        NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
    opens_at            TIME            NOT NULL,
    closes_at           TIME            NOT NULL,
    CONSTRAINT bhi_times_check CHECK (closes_at > opens_at)
);

-- ---------------------------------------------------------------------------
-- sla_policies
-- Define first-reply and resolution time targets.
-- ---------------------------------------------------------------------------

CREATE TABLE sla_policies (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                    VARCHAR(255)    NOT NULL,
    first_reply_minutes     INTEGER         NOT NULL,
    next_reply_minutes      INTEGER,
    resolution_minutes      INTEGER         NOT NULL,
    schedule_id             UUID            REFERENCES business_hour_schedules(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- tags
-- Reusable tags scoped to a workspace (shared by tickets).
-- ---------------------------------------------------------------------------

CREATE TABLE tags (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                VARCHAR(64)     NOT NULL,
    color               CHAR(7)         NOT NULL DEFAULT '#94a3b8',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, name)
);

-- ---------------------------------------------------------------------------
-- tickets
-- Core entity of the support module.
-- ---------------------------------------------------------------------------
-- 3NF notes:
--   · first_replied_at and resolved_at are direct facts about the ticket
--     lifecycle; they do not transitively depend on any non-key attribute.
--   · csat_score and csat_responded_at are ticket-level facts (one CSAT
--     per ticket); no separate table needed unless multi-survey is planned.
--   · SLA breach timestamps are in sla_breaches (separate table) to avoid
--     nulls and transitive dependency on sla_policy_id.

CREATE TABLE tickets (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    requester_id        UUID            NOT NULL REFERENCES contacts(id),
    assignee_id         UUID            REFERENCES users(id) ON DELETE SET NULL,
    agent_group_id      UUID            REFERENCES agent_groups(id) ON DELETE SET NULL,
    sla_policy_id       UUID            REFERENCES sla_policies(id) ON DELETE SET NULL,
    subject             VARCHAR(255)    NOT NULL,
    status              ticket_status   NOT NULL DEFAULT 'new',
    priority            ticket_priority NOT NULL DEFAULT 'normal',
    channel             ticket_channel  NOT NULL,
    csat_rating         csat_rating,
    csat_responded_at   TIMESTAMPTZ,
    first_replied_at    TIMESTAMPTZ,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- ticket_ccs
-- Additional contacts CC'd on a ticket.
-- Extracted from tickets to avoid a repeating-group array (3NF).
-- ---------------------------------------------------------------------------

CREATE TABLE ticket_ccs (
    ticket_id           UUID            NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    contact_id          UUID            NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    PRIMARY KEY (ticket_id, contact_id)
);

-- ---------------------------------------------------------------------------
-- ticket_tags
-- Junction: many-to-many between tickets and tags.
-- ---------------------------------------------------------------------------

CREATE TABLE ticket_tags (
    ticket_id           UUID            NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    tag_id              UUID            NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (ticket_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- ticket_messages
-- Every inbound/outbound message on a ticket thread.
-- ---------------------------------------------------------------------------

CREATE TABLE ticket_messages (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id           UUID            NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_type         sender_type     NOT NULL,
    sender_user_id      UUID            REFERENCES users(id) ON DELETE SET NULL,
    sender_contact_id   UUID            REFERENCES contacts(id) ON DELETE SET NULL,
    body                TEXT            NOT NULL,
    is_internal         BOOLEAN         NOT NULL DEFAULT FALSE,   -- agent-only note
    channel             ticket_channel  NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT ticket_messages_sender_check CHECK (
        (sender_type = 'user'    AND sender_user_id    IS NOT NULL AND sender_contact_id IS NULL) OR
        (sender_type = 'contact' AND sender_contact_id IS NOT NULL AND sender_user_id    IS NULL)
    )
);

-- ---------------------------------------------------------------------------
-- ticket_attachments
-- Files attached to a ticket message.
-- Separated from ticket_messages to avoid repeating file metadata (3NF).
-- ---------------------------------------------------------------------------

CREATE TABLE ticket_attachments (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id          UUID            NOT NULL REFERENCES ticket_messages(id) ON DELETE CASCADE,
    filename            VARCHAR(255)    NOT NULL,
    mime_type           VARCHAR(127)    NOT NULL,
    size_bytes          BIGINT          NOT NULL,
    storage_key         VARCHAR(1024)   NOT NULL,   -- S3 object key
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- sla_breaches
-- Records each SLA metric breach per ticket.
-- Separated from tickets so multiple breach types don't create nulls (3NF).
-- ---------------------------------------------------------------------------

CREATE TABLE sla_breaches (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id           UUID            NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    metric              VARCHAR(32)     NOT NULL,   -- 'first_reply', 'next_reply', 'resolution'
    breached_at         TIMESTAMPTZ     NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (ticket_id, metric)
);

-- ---------------------------------------------------------------------------
-- macros
-- Saved agent response templates.
-- ---------------------------------------------------------------------------

CREATE TABLE macros (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by          UUID            NOT NULL REFERENCES users(id),
    name                VARCHAR(255)    NOT NULL,
    body                TEXT            NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- macro_actions
-- Side-effects a macro applies when used (set status, add tag, etc.).
-- Separated from macros to avoid repeating action groups (3NF).
-- ---------------------------------------------------------------------------

CREATE TABLE macro_actions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    macro_id            UUID            NOT NULL REFERENCES macros(id) ON DELETE CASCADE,
    action_type         VARCHAR(64)     NOT NULL,   -- 'set_status', 'add_tag', 'assign', ...
    action_value        TEXT,
    sort_order          SMALLINT        NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- automations
-- Trigger-based rule definitions.
-- ---------------------------------------------------------------------------

CREATE TABLE automations (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by          UUID            NOT NULL REFERENCES users(id),
    name                VARCHAR(255)    NOT NULL,
    trigger_event       VARCHAR(64)     NOT NULL,   -- 'ticket.created', 'sla.breached', ...
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- automation_conditions
-- Individual conditions within an automation rule (AND-joined by default).
-- Extracted to avoid repeating-group columns (3NF).
-- ---------------------------------------------------------------------------

CREATE TABLE automation_conditions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id       UUID            NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    field               VARCHAR(64)     NOT NULL,   -- 'priority', 'channel', 'tag', ...
    operator            VARCHAR(16)     NOT NULL,   -- 'eq', 'neq', 'contains', ...
    value               TEXT            NOT NULL,
    sort_order          SMALLINT        NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- automation_actions
-- Operations executed when an automation fires.
-- Extracted to avoid repeating-group columns (3NF).
-- ---------------------------------------------------------------------------

CREATE TABLE automation_actions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id       UUID            NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    action_type         VARCHAR(64)     NOT NULL,
    action_value        TEXT,
    sort_order          SMALLINT        NOT NULL DEFAULT 0
);

-- =============================================================================
-- SECTION 4 — KNOWLEDGE BASE
-- =============================================================================

-- ---------------------------------------------------------------------------
-- kb_categories
-- Top-level groupings in the knowledge base.
-- ---------------------------------------------------------------------------

CREATE TABLE kb_categories (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    slug                VARCHAR(255)    NOT NULL,
    position            SMALLINT        NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, slug)
);

-- ---------------------------------------------------------------------------
-- kb_sections
-- Sub-groupings within a category.
-- ---------------------------------------------------------------------------

CREATE TABLE kb_sections (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id         UUID            NOT NULL REFERENCES kb_categories(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    slug                VARCHAR(255)    NOT NULL,
    position            SMALLINT        NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (category_id, slug)
);

-- ---------------------------------------------------------------------------
-- kb_articles
-- Knowledge base articles.
-- ---------------------------------------------------------------------------
-- 3NF note: views_count, helpful_count, unhelpful_count would be derived
-- from kb_article_votes/kb_article_views — stored here as a denormalised
-- read-optimised cache, incremented atomically. If strict 3NF is preferred
-- they can be dropped and computed at query time.

CREATE TABLE kb_articles (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id          UUID            NOT NULL REFERENCES kb_sections(id) ON DELETE CASCADE,
    author_id           UUID            NOT NULL REFERENCES users(id),
    title               VARCHAR(255)    NOT NULL,
    slug                VARCHAR(255)    NOT NULL,
    body                TEXT            NOT NULL,
    status              article_status  NOT NULL DEFAULT 'draft',
    position            SMALLINT        NOT NULL DEFAULT 0,
    views_count         INTEGER         NOT NULL DEFAULT 0,
    helpful_count       INTEGER         NOT NULL DEFAULT 0,
    unhelpful_count     INTEGER         NOT NULL DEFAULT 0,
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    UNIQUE (section_id, slug)
);

-- ---------------------------------------------------------------------------
-- kb_article_versions
-- Immutable history of article edits.
-- Separated from kb_articles so version data doesn't repeat (3NF).
-- ---------------------------------------------------------------------------

CREATE TABLE kb_article_versions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id          UUID            NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    author_id           UUID            NOT NULL REFERENCES users(id),
    title               VARCHAR(255)    NOT NULL,
    body                TEXT            NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- kb_article_translations
-- Multilingual versions of an article.
-- Extracted so locale is not part of the main articles table (3NF).
-- ---------------------------------------------------------------------------

CREATE TABLE kb_article_translations (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id          UUID            NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    locale              VARCHAR(10)     NOT NULL,
    title               VARCHAR(255)    NOT NULL,
    body                TEXT            NOT NULL,
    status              article_status  NOT NULL DEFAULT 'draft',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (article_id, locale)
);

-- =============================================================================
-- SECTION 5 — MODULE BRIDGE (Tracker ↔ Support)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- issue_ticket_links
-- Many-to-many bridge between issues and tickets.
-- ---------------------------------------------------------------------------

CREATE TABLE issue_ticket_links (
    issue_id            UUID            NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    ticket_id           UUID            NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    created_by          UUID            NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (issue_id, ticket_id)
);

-- =============================================================================
-- SECTION 6 — NOTIFICATIONS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- notifications
-- In-app notification inbox entries per user.
-- ---------------------------------------------------------------------------

CREATE TABLE notifications (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                VARCHAR(64)     NOT NULL,   -- 'issue_assigned', 'ticket_replied', ...
    subject_type        VARCHAR(64)     NOT NULL,   -- 'issue', 'ticket', 'comment'
    subject_id          UUID            NOT NULL,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- =============================================================================
-- SECTION 8 — INVITATIONS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- invitations
-- Pending member invites for a workspace.  One unaccepted invite per email
-- per workspace (enforced by the partial-unique index idx_invitations_pending).
-- The token_hash stores the SHA-256 hex of the invite token; the plaintext is
-- sent only in the invite email and never stored.
-- This is the only schema addition in Plan 2 (Auth & RBAC), making 17 RLS tables.
-- ---------------------------------------------------------------------------

CREATE TABLE invitations (
    id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email         CITEXT          NOT NULL,
    admin_level   admin_level     NOT NULL DEFAULT 'member',
    is_developer  BOOLEAN         NOT NULL DEFAULT FALSE,
    is_agent      BOOLEAN         NOT NULL DEFAULT FALSE,
    token_hash    VARCHAR(64)     NOT NULL UNIQUE,   -- sha256 hex of the invite token
    invited_by    UUID            NOT NULL REFERENCES users(id),
    expires_at    TIMESTAMPTZ     NOT NULL,
    accepted_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);
-- one pending (unaccepted) invite per email per workspace:
CREATE UNIQUE INDEX idx_invitations_pending ON invitations (workspace_id, email) WHERE accepted_at IS NULL;
CREATE INDEX idx_invitations_workspace ON invitations (workspace_id);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Workspace lookups
CREATE INDEX idx_users_workspace           ON users(workspace_id);
CREATE INDEX idx_users_email               ON users(email);
CREATE INDEX idx_teams_workspace           ON teams(workspace_id);

-- Issue tracker
CREATE INDEX idx_issues_workspace          ON issues(workspace_id);
CREATE INDEX idx_issues_team               ON issues(team_id);
CREATE INDEX idx_issues_project            ON issues(project_id);
CREATE INDEX idx_issues_cycle              ON issues(cycle_id);
CREATE INDEX idx_issues_assignee           ON issues(assignee_id);
CREATE INDEX idx_issues_status             ON issues(status);
CREATE INDEX idx_issues_parent             ON issues(parent_issue_id);
CREATE INDEX idx_issue_blockers_blocked    ON issue_blockers(blocked_issue_id);
CREATE INDEX idx_issue_activities_issue    ON issue_activities(issue_id);
CREATE INDEX idx_issue_comments_issue      ON issue_comments(issue_id);

-- Support
CREATE INDEX idx_tickets_workspace         ON tickets(workspace_id);
CREATE INDEX idx_tickets_requester         ON tickets(requester_id);
CREATE INDEX idx_tickets_assignee          ON tickets(assignee_id);
CREATE INDEX idx_tickets_status            ON tickets(status);
CREATE INDEX idx_tickets_channel           ON tickets(channel);
CREATE INDEX idx_ticket_messages_ticket    ON ticket_messages(ticket_id);
CREATE INDEX idx_contacts_workspace        ON contacts(workspace_id);
CREATE INDEX idx_contacts_email            ON contacts(email);

-- Knowledge base
CREATE INDEX idx_kb_articles_section       ON kb_articles(section_id);
CREATE INDEX idx_kb_articles_status        ON kb_articles(status);

-- Notifications
CREATE INDEX idx_notifications_user        ON notifications(user_id, read_at);

-- =============================================================================
-- SECTION 7 — ROW-LEVEL SECURITY (defense-in-depth tenant isolation)
-- =============================================================================
-- A database-level backstop beneath the application WorkspaceScope global scope
-- (see docs/multi-tenancy.md). The application declares the active tenant on the
-- connection for each request/job via the SetWorkspaceScopeTask switch task:
--
--     SELECT set_config('app.current_workspace_id', '<workspace uuid>', false);
--
-- and clears it on forget. Each policy is PERMISSIVE when the setting is absent
-- or empty, so landlord routes, artisan commands, and cross-tenant jobs (which
-- run with no active tenant) retain full access — mirroring WorkspaceScope's
-- "permissive when no tenant" behaviour. FORCE ROW LEVEL SECURITY makes the
-- policy apply to the table owner role as well, not just non-owners.
--
-- Only the tables that carry workspace_id directly are listed; their child
-- tables are reachable only through a visible parent (FK ON DELETE CASCADE).
-- Omitting WITH CHECK makes the USING expression govern INSERT/UPDATE too.

DO $$
DECLARE
    tenant_table TEXT;
BEGIN
    FOREACH tenant_table IN ARRAY ARRAY[
        'users', 'teams', 'webhooks', 'labels', 'projects', 'issues',
        'contacts', 'agent_groups', 'business_hour_schedules', 'sla_policies',
        'tags', 'tickets', 'macros', 'automations', 'kb_categories', 'notifications',
        'invitations'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tenant_table);
        EXECUTE format('ALTER TABLE %I FORCE  ROW LEVEL SECURITY;', tenant_table);
        -- Use NULLIF + text comparison instead of ::uuid cast.
        -- Postgres does not guarantee OR short-circuit, so `current_setting(...)::uuid`
        -- can be evaluated even when an earlier branch is already true, crashing with
        -- "invalid input syntax for type uuid: """ when the GUC is the empty string
        -- (set by forgetCurrent() on landlord routes).  Casting workspace_id::text is
        -- safe because all stored UUIDs are canonical lowercase — both sides match.
        EXECUTE format(
            'CREATE POLICY %1$s_workspace_isolation ON %1$I USING ('
            || 'NULLIF(current_setting(''app.current_workspace_id'', true), '''') IS NULL OR '
            || 'workspace_id::text = current_setting(''app.current_workspace_id'', true));',
            tenant_table
        );
    END LOOP;
END $$;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================