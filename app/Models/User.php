<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Class User
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string|null $password_hash
 * @property string $admin_level
 * @property bool $is_developer
 * @property bool $is_agent
 * @property string|null $avatar_url
 * @property string $timezone
 * @property string $locale
 * @property Carbon|null $last_seen_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property Workspace $workspace
 * @property Collection|AgentGroup[] $agentGroupMembersAgentGroups
 * @property Collection|Workspace[] $automationsWorkspaces
 * @property Collection|Issue[] $issueActivitiesIssues
 * @property Collection|Issue[] $issueBlockersIssues
 * @property Collection|Issue[] $issueCommentsIssues
 * @property Collection|Issue[] $issueTicketLinksIssues
 * @property Collection|Ticket[] $issueTicketLinksTickets
 * @property Collection|Cycle[] $issuesCycles
 * @property Collection|Issue[] $issuesIssues
 * @property Collection|Project[] $issuesProjects
 * @property Collection|Team[] $issuesTeams
 * @property Collection|Workspace[] $issuesWorkspaces
 * @property Collection|KbArticle[] $kbArticleVersionsKbArticles
 * @property Collection|KbSection[] $kbArticlesKbSections
 * @property Collection|Workspace[] $macrosWorkspaces
 * @property Collection|Workspace[] $notificationsWorkspaces
 * @property Collection|Project[] $projectMembersProjects
 * @property Collection|Team[] $projectsTeams
 * @property Collection|Workspace[] $projectsWorkspaces
 * @property Collection|Team[] $teamMembersTeams
 * @property Collection|Contact[] $ticketMessagesContacts
 * @property Collection|Ticket[] $ticketMessagesTickets
 * @property Collection|AgentGroup[] $ticketsAgentGroups
 * @property Collection|Contact[] $ticketsContacts
 * @property Collection|SlaPolicy[] $ticketsSlaPolicies
 * @property Collection|Workspace[] $ticketsWorkspaces
 * @property Collection|AgentGroupMember[] $agentGroupMembers
 * @property Collection|Automation[] $automations
 * @property Collection|IssueActivity[] $issueActivities
 * @property Collection|IssueBlocker[] $issueBlockers
 * @property Collection|IssueComment[] $issueComments
 * @property Collection|IssueTicketLink[] $issueTicketLinks
 * @property Collection|Issue[] $issuesAsAssignee
 * @property Collection|Issue[] $issuesAsCreatedBy
 * @property Collection|KbArticleVersion[] $kbArticleVersions
 * @property Collection|KbArticle[] $kbArticles
 * @property Collection|Macro[] $macros
 * @property Collection|Notification[] $notifications
 * @property Collection|OauthIdentity[] $oauthIdentities
 * @property Collection|ProjectMember[] $projectMembers
 * @property Collection|Project[] $projects
 * @property Collection|TeamMember[] $teamMembers
 * @property Collection|TicketMessage[] $ticketMessages
 * @property Collection|Ticket[] $tickets
 */
#[Table(
    name: 'users',
    key: 'id',
    keyType: 'string',
    incrementing: false,
    timestamps: true,
)]
#[Connection('pgsql')]
#[Fillable(['id', 'name', 'email', 'email_verified_at', 'password_hash', 'admin_level', 'is_developer', 'is_agent', 'avatar_url', 'timezone', 'locale', 'last_seen_at'])]
class User extends Authenticatable
{
    use BelongsToWorkspace;
    use HasFactory;
    use Notifiable;
    use SoftDeletes;

    public $incrementing = false;

    protected $keyType = 'string';

    public function getAuthPassword(): string
    {
        return (string) $this->password_hash;
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'workspace_id' => 'string',
            'name' => 'string',
            'email' => 'string',
            'email_verified_at' => 'datetime',
            'password_hash' => 'string',
            'admin_level' => 'string',
            'is_developer' => 'boolean',
            'is_agent' => 'boolean',
            'avatar_url' => 'string',
            'timezone' => 'string',
            'locale' => 'string',
            'last_seen_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<AgentGroupMember, $this>
     */
    public function agentGroupMembers(): HasMany
    {
        return $this->hasMany(AgentGroupMember::class, 'user_id', 'id');
    }

    /**
     * @return HasMany<Automation, $this>
     */
    public function automations(): HasMany
    {
        return $this->hasMany(Automation::class, 'created_by', 'id');
    }

    /**
     * @return HasMany<IssueActivity, $this>
     */
    public function issueActivities(): HasMany
    {
        return $this->hasMany(IssueActivity::class, 'user_id', 'id');
    }

    /**
     * @return HasMany<IssueBlocker, $this>
     */
    public function issueBlockers(): HasMany
    {
        return $this->hasMany(IssueBlocker::class, 'created_by', 'id');
    }

    /**
     * @return HasMany<IssueComment, $this>
     */
    public function issueComments(): HasMany
    {
        return $this->hasMany(IssueComment::class, 'user_id', 'id');
    }

    /**
     * @return HasMany<IssueTicketLink, $this>
     */
    public function issueTicketLinks(): HasMany
    {
        return $this->hasMany(IssueTicketLink::class, 'created_by', 'id');
    }

    /**
     * @return HasMany<Issue, $this>
     */
    public function issuesAsAssignee(): HasMany
    {
        return $this->hasMany(Issue::class, 'assignee_id', 'id');
    }

    /**
     * @return HasMany<Issue, $this>
     */
    public function issuesAsCreatedBy(): HasMany
    {
        return $this->hasMany(Issue::class, 'created_by', 'id');
    }

    /**
     * @return HasMany<KbArticleVersion, $this>
     */
    public function kbArticleVersions(): HasMany
    {
        return $this->hasMany(KbArticleVersion::class, 'author_id', 'id');
    }

    /**
     * @return HasMany<KbArticle, $this>
     */
    public function kbArticles(): HasMany
    {
        return $this->hasMany(KbArticle::class, 'author_id', 'id');
    }

    /**
     * @return HasMany<Macro, $this>
     */
    public function macros(): HasMany
    {
        return $this->hasMany(Macro::class, 'created_by', 'id');
    }

    /**
     * @return HasMany<Notification, $this>
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'user_id', 'id');
    }

    /**
     * @return HasMany<OauthIdentity, $this>
     */
    public function oauthIdentities(): HasMany
    {
        return $this->hasMany(OauthIdentity::class, 'user_id', 'id');
    }

    /**
     * @return HasMany<ProjectMember, $this>
     */
    public function projectMembers(): HasMany
    {
        return $this->hasMany(ProjectMember::class, 'user_id', 'id');
    }

    /**
     * @return HasMany<Project, $this>
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'created_by', 'id');
    }

    /**
     * @return HasMany<TeamMember, $this>
     */
    public function teamMembers(): HasMany
    {
        return $this->hasMany(TeamMember::class, 'user_id', 'id');
    }

    /**
     * @return HasMany<TicketMessage, $this>
     */
    public function ticketMessages(): HasMany
    {
        return $this->hasMany(TicketMessage::class, 'sender_user_id', 'id');
    }

    /**
     * @return HasMany<Ticket, $this>
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'assignee_id', 'id');
    }

    /**
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    /**
     * @return BelongsToMany<AgentGroup, $this>
     */
    public function agentGroupMembersAgentGroups(): BelongsToMany
    {
        return $this->belongsToMany(AgentGroup::class, 'agent_group_members', 'id', 'id')
            ->withPivot('user_id', 'created_at');
    }

    /**
     * @return BelongsToMany<Workspace, $this>
     */
    public function automationsWorkspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'automations', 'id', 'id')
            ->withPivot('workspace_id', 'created_by', 'name', 'trigger_event', 'is_active')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Issue, $this>
     */
    public function issueActivitiesIssues(): BelongsToMany
    {
        return $this->belongsToMany(Issue::class, 'issue_activities', 'id', 'id')
            ->withPivot('issue_id', 'user_id', 'type', 'from_value', 'to_value', 'created_at');
    }

    /**
     * @return BelongsToMany<Issue, $this>
     */
    public function issueBlockersIssues(): BelongsToMany
    {
        return $this->belongsToMany(Issue::class, 'issue_blockers', 'id', 'id')
            ->withPivot('blocked_issue_id', 'created_by', 'created_at');
    }

    /**
     * @return BelongsToMany<Issue, $this>
     */
    public function issueCommentsIssues(): BelongsToMany
    {
        return $this->belongsToMany(Issue::class, 'issue_comments', 'id', 'id')
            ->withPivot('issue_id', 'user_id', 'body', 'is_internal', 'edited_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Issue, $this>
     */
    public function issueTicketLinksIssues(): BelongsToMany
    {
        return $this->belongsToMany(Issue::class, 'issue_ticket_links', 'id', 'id')
            ->withPivot('ticket_id', 'created_by', 'created_at');
    }

    /**
     * @return BelongsToMany<Ticket, $this>
     */
    public function issueTicketLinksTickets(): BelongsToMany
    {
        return $this->belongsToMany(Ticket::class, 'issue_ticket_links', 'id', 'id')
            ->withPivot('ticket_id', 'created_by', 'created_at');
    }

    /**
     * @return BelongsToMany<Cycle, $this>
     */
    public function issuesCycles(): BelongsToMany
    {
        return $this->belongsToMany(Cycle::class, 'issues', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'project_id', 'cycle_id', 'parent_issue_id', 'assignee_id', 'created_by', 'title', 'description', 'status', 'priority', 'estimate', 'due_date', 'sort_order', 'archived_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Issue, $this>
     */
    public function issuesIssues(): BelongsToMany
    {
        return $this->belongsToMany(Issue::class, 'issues', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'project_id', 'cycle_id', 'parent_issue_id', 'assignee_id', 'created_by', 'title', 'description', 'status', 'priority', 'estimate', 'due_date', 'sort_order', 'archived_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Project, $this>
     */
    public function issuesProjects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'issues', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'project_id', 'cycle_id', 'parent_issue_id', 'assignee_id', 'created_by', 'title', 'description', 'status', 'priority', 'estimate', 'due_date', 'sort_order', 'archived_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Team, $this>
     */
    public function issuesTeams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'issues', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'project_id', 'cycle_id', 'parent_issue_id', 'assignee_id', 'created_by', 'title', 'description', 'status', 'priority', 'estimate', 'due_date', 'sort_order', 'archived_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Workspace, $this>
     */
    public function issuesWorkspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'issues', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'project_id', 'cycle_id', 'parent_issue_id', 'assignee_id', 'created_by', 'title', 'description', 'status', 'priority', 'estimate', 'due_date', 'sort_order', 'archived_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<KbArticle, $this>
     */
    public function kbArticleVersionsKbArticles(): BelongsToMany
    {
        return $this->belongsToMany(KbArticle::class, 'kb_article_versions', 'id', 'id')
            ->withPivot('article_id', 'author_id', 'title', 'body', 'created_at');
    }

    /**
     * @return BelongsToMany<KbSection, $this>
     */
    public function kbArticlesKbSections(): BelongsToMany
    {
        return $this->belongsToMany(KbSection::class, 'kb_articles', 'id', 'id')
            ->withPivot('section_id', 'author_id', 'title', 'slug', 'body', 'status', 'position', 'views_count', 'helpful_count', 'unhelpful_count', 'published_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Workspace, $this>
     */
    public function macrosWorkspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'macros', 'id', 'id')
            ->withPivot('workspace_id', 'created_by', 'name', 'body')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Workspace, $this>
     */
    public function notificationsWorkspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'notifications', 'id', 'id')
            ->withPivot('workspace_id', 'user_id', 'type', 'subject_type', 'subject_id', 'read_at', 'created_at');
    }

    /**
     * @return BelongsToMany<Project, $this>
     */
    public function projectMembersProjects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_members', 'id', 'id')
            ->withPivot('user_id', 'created_at');
    }

    /**
     * @return BelongsToMany<Team, $this>
     */
    public function projectsTeams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'projects', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'name', 'description', 'icon', 'color', 'status', 'start_date', 'target_date', 'created_by', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Workspace, $this>
     */
    public function projectsWorkspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'projects', 'id', 'id')
            ->withPivot('workspace_id', 'team_id', 'name', 'description', 'icon', 'color', 'status', 'start_date', 'target_date', 'created_by', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Team, $this>
     */
    public function teamMembersTeams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'team_members', 'id', 'id')
            ->withPivot('user_id', 'role', 'created_at');
    }

    /**
     * @return BelongsToMany<Contact, $this>
     */
    public function ticketMessagesContacts(): BelongsToMany
    {
        return $this->belongsToMany(Contact::class, 'ticket_messages', 'id', 'id')
            ->withPivot('ticket_id', 'sender_type', 'sender_user_id', 'sender_contact_id', 'body', 'is_internal', 'channel', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Ticket, $this>
     */
    public function ticketMessagesTickets(): BelongsToMany
    {
        return $this->belongsToMany(Ticket::class, 'ticket_messages', 'id', 'id')
            ->withPivot('ticket_id', 'sender_type', 'sender_user_id', 'sender_contact_id', 'body', 'is_internal', 'channel', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<AgentGroup, $this>
     */
    public function ticketsAgentGroups(): BelongsToMany
    {
        return $this->belongsToMany(AgentGroup::class, 'tickets', 'id', 'id')
            ->withPivot('workspace_id', 'requester_id', 'assignee_id', 'agent_group_id', 'sla_policy_id', 'subject', 'status', 'priority', 'channel', 'csat_rating', 'csat_responded_at', 'first_replied_at', 'resolved_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Contact, $this>
     */
    public function ticketsContacts(): BelongsToMany
    {
        return $this->belongsToMany(Contact::class, 'tickets', 'id', 'id')
            ->withPivot('workspace_id', 'requester_id', 'assignee_id', 'agent_group_id', 'sla_policy_id', 'subject', 'status', 'priority', 'channel', 'csat_rating', 'csat_responded_at', 'first_replied_at', 'resolved_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<SlaPolicy, $this>
     */
    public function ticketsSlaPolicies(): BelongsToMany
    {
        return $this->belongsToMany(SlaPolicy::class, 'tickets', 'id', 'id')
            ->withPivot('workspace_id', 'requester_id', 'assignee_id', 'agent_group_id', 'sla_policy_id', 'subject', 'status', 'priority', 'channel', 'csat_rating', 'csat_responded_at', 'first_replied_at', 'resolved_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Workspace, $this>
     */
    public function ticketsWorkspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'tickets', 'id', 'id')
            ->withPivot('workspace_id', 'requester_id', 'assignee_id', 'agent_group_id', 'sla_policy_id', 'subject', 'status', 'priority', 'channel', 'csat_rating', 'csat_responded_at', 'first_replied_at', 'resolved_at', 'deleted_at')
            ->withTimestamps();
    }
}
