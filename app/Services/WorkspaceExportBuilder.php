<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AgentGroup;
use App\Models\AgentGroupMember;
use App\Models\BusinessHourInterval;
use App\Models\BusinessHourSchedule;
use App\Models\Contact;
use App\Models\ContactMetadatum;
use App\Models\Cycle;
use App\Models\HelpdeskSavedReport;
use App\Models\HelpdeskSavedView;
use App\Models\Issue;
use App\Models\IssueActivity;
use App\Models\IssueBlocker;
use App\Models\IssueComment;
use App\Models\IssueCommentReaction;
use App\Models\IssueGithubLink;
use App\Models\IssueLabel;
use App\Models\IssueTicketLink;
use App\Models\Label;
use App\Models\Milestone;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\Release;
use App\Models\SavedView;
use App\Models\SlaBreach;
use App\Models\SlaPolicy;
use App\Models\Tag;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\TicketTag;
use App\Models\User;
use App\Models\Workspace;
use Carbon\CarbonInterface;
use RuntimeException;
use ZipArchive;

/**
 * Builds the owner-facing workspace export: a ZIP of flat JSON files, one per
 * entity, plus a manifest. The entity ALLOWLIST below is the security
 * mechanism — every entity names its columns explicitly; anything unlisted
 * (tokens, oauth identities, sessions, notification inboxes, integration
 * credentials) is structurally unreachable.
 *
 * Tenancy: workspace-scoped models are queried normally (WorkspaceScope + RLS
 * bound to the request's tenant). Tables without workspace_id are resolved
 * through their workspace-scoped parents via whereIn on parent ids.
 */
final class WorkspaceExportBuilder
{
    /** @return array{path: string, filename: string} */
    public function build(Workspace $workspace): array
    {
        $path = tempnam(sys_get_temp_dir(), 'prizy-export');
        if ($path === false) {
            throw new RuntimeException('Unable to allocate a temp file for the export.');
        }

        $zip = new ZipArchive;
        if ($zip->open($path, ZipArchive::OVERWRITE) !== true) {
            @unlink($path);
            throw new RuntimeException('Unable to open the export archive.');
        }

        try {
            $entities = $this->entities($workspace);

            // Manifest first (cheap count queries; entity bodies stream after).
            $counts = [];
            foreach ($entities as $name => $entity) {
                $counts[$name] = $entity['count']();
            }
            $zip->addFromString('manifest.json', (string) json_encode([
                'workspace' => ['id' => $workspace->id, 'name' => $workspace->name, 'slug' => $workspace->slug],
                'exported_at' => now()->toISOString(),
                'app_version' => (string) config('app.version', 'dev'),
                'counts' => $counts,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            foreach ($entities as $name => $entity) {
                $this->addEntity($zip, $name, $entity['rows']());
            }

            $zip->close();
        } catch (\Throwable $e) {
            $zip->close();
            @unlink($path);
            throw $e;
        }

        return [
            'path' => $path,
            'filename' => sprintf('prizy-export-%s-%s.zip', $workspace->slug, now()->format('Y-m-d')),
        ];
    }

    /**
     * Streams one entity into the zip as a JSON array without holding all rows
     * in memory: rows are encoded one at a time into a temp stream.
     *
     * @param  iterable<int, array<string, mixed>>  $rows
     */
    private function addEntity(ZipArchive $zip, string $name, iterable $rows): void
    {
        $stream = fopen('php://temp/maxmemory:2097152', 'r+b');
        if ($stream === false) {
            throw new RuntimeException('Unable to open an export buffer.');
        }
        fwrite($stream, '[');
        $first = true;
        foreach ($rows as $row) {
            fwrite($stream, ($first ? '' : ',')."\n  ".json_encode($row, JSON_UNESCAPED_SLASHES));
            $first = false;
        }
        fwrite($stream, "\n]");
        rewind($stream);
        $zip->addFromString("{$name}.json", (string) stream_get_contents($stream));
        fclose($stream);
    }

    private function iso(mixed $value): mixed
    {
        return $value instanceof CarbonInterface ? $value->toISOString() : $value;
    }

    /**
     * The allowlist: entity name → ['count' => fn(): int, 'rows' => fn(): iterable].
     * Column lists are explicit; verify each against the model before changing.
     *
     * @return array<string, array{count: callable, rows: callable}>
     */
    private function entities(Workspace $workspace): array
    {
        $pick = fn (array $columns) => function (object $m) use ($columns): array {
            $row = [];
            foreach ($columns as $c) {
                $row[$c] = $this->iso($m->{$c});
            }

            return $row;
        };

        // Parent-id closures are lazy (called at iteration time, after manifest counts).
        $teamIds = fn () => Team::query()->pluck('id');
        $issueIds = fn () => Issue::query()->pluck('id');
        $commentIds = fn () => IssueComment::query()->whereIn('issue_id', $issueIds())->pluck('id');
        $ticketIds = fn () => Ticket::query()->pluck('id');
        $projectIds = fn () => Project::query()->pluck('id');
        $contactIds = fn () => Contact::query()->pluck('id');
        $scheduleIds = fn () => BusinessHourSchedule::query()->pluck('id');
        $groupIds = fn () => AgentGroup::query()->pluck('id');

        return [
            'workspace' => [
                'count' => fn (): int => 1,
                'rows' => fn (): iterable => [
                    ['id' => $workspace->id, 'name' => $workspace->name, 'slug' => $workspace->slug, 'created_at' => $this->iso($workspace->created_at)],
                ],
            ],
            'teams' => [
                'count' => fn (): int => Team::query()->count(),
                'rows' => fn (): iterable => Team::query()->lazy(500)->map($pick(['id', 'name', 'identifier', 'created_at'])),
            ],
            'team_members' => [
                'count' => fn (): int => TeamMember::query()->whereIn('team_id', $teamIds())->count(),
                'rows' => fn (): iterable => TeamMember::query()->whereIn('team_id', $teamIds())->lazy(500)->map($pick(['team_id', 'user_id', 'role', 'created_at'])),
            ],
            'members' => [
                'count' => fn (): int => User::query()->count(),
                'rows' => fn (): iterable => User::query()->lazy(500)->map(fn (User $u): array => [
                    'id' => $u->id, 'name' => $u->name, 'email' => $u->email,
                    'admin_level' => $u->admin_level, 'is_developer' => (bool) $u->is_developer,
                    'is_agent' => (bool) $u->is_agent, 'verified' => $u->email_verified_at !== null,
                    'created_at' => $this->iso($u->created_at),
                ]),
            ],
            'issues' => [
                'count' => fn (): int => Issue::query()->count(),
                'rows' => fn (): iterable => Issue::query()->lazy(500)->map($pick([
                    'id', 'team_id', 'project_id', 'cycle_id', 'release_id', 'parent_issue_id',
                    'assignee_id', 'created_by', 'title', 'description', 'status', 'priority',
                    'estimate', 'due_date', 'sort_order', 'completed_at', 'archived_at',
                    'created_at', 'updated_at',
                ])),
            ],
            'issue_comments' => [
                'count' => fn (): int => IssueComment::query()->whereIn('issue_id', $issueIds())->count(),
                'rows' => fn (): iterable => IssueComment::query()->whereIn('issue_id', $issueIds())->lazy(500)->map($pick(['id', 'issue_id', 'user_id', 'body', 'created_at', 'updated_at'])),
            ],
            // NOTE: issue_comment_reactions has NO issue_id column — only issue_comment_id.
            // Scope through the comment ids of in-workspace issues.
            'issue_comment_reactions' => [
                'count' => fn (): int => IssueCommentReaction::query()->whereIn('issue_comment_id', $commentIds())->count(),
                'rows' => fn (): iterable => IssueCommentReaction::query()->whereIn('issue_comment_id', $commentIds())->lazy(500)->map($pick(['id', 'issue_comment_id', 'user_id', 'emoji', 'created_at'])),
            ],
            'issue_activities' => [
                'count' => fn (): int => IssueActivity::query()->whereIn('issue_id', $issueIds())->count(),
                'rows' => fn (): iterable => IssueActivity::query()->whereIn('issue_id', $issueIds())->lazy(500)->map($pick(['id', 'issue_id', 'user_id', 'type', 'from_value', 'to_value', 'created_at'])),
            ],
            'issue_labels' => [
                'count' => fn (): int => IssueLabel::query()->whereIn('issue_id', $issueIds())->count(),
                'rows' => fn (): iterable => IssueLabel::query()->whereIn('issue_id', $issueIds())->lazy(500)->map($pick(['issue_id', 'label_id'])),
            ],
            // NOTE: columns are blocking_issue_id/blocked_issue_id/created_by (not issue_id/blocked_by_issue_id).
            'issue_blockers' => [
                'count' => fn (): int => IssueBlocker::query()->whereIn('blocking_issue_id', $issueIds())->count(),
                'rows' => fn (): iterable => IssueBlocker::query()->whereIn('blocking_issue_id', $issueIds())->lazy(500)->map($pick(['blocking_issue_id', 'blocked_issue_id', 'created_by', 'created_at'])),
            ],
            // NOTE: real columns are repo/number/source/created_by (not kind/external_id).
            'issue_github_links' => [
                'count' => fn (): int => IssueGithubLink::query()->whereIn('issue_id', $issueIds())->count(),
                'rows' => fn (): iterable => IssueGithubLink::query()->whereIn('issue_id', $issueIds())->lazy(500)->map($pick(['id', 'issue_id', 'repo', 'number', 'url', 'title', 'state', 'source', 'created_by', 'created_at'])),
            ],
            'issue_ticket_links' => [
                'count' => fn (): int => IssueTicketLink::query()->whereIn('issue_id', $issueIds())->count(),
                'rows' => fn (): iterable => IssueTicketLink::query()->whereIn('issue_id', $issueIds())->lazy(500)->map($pick(['issue_id', 'ticket_id', 'created_at'])),
            ],
            'projects' => [
                'count' => fn (): int => Project::query()->count(),
                'rows' => fn (): iterable => Project::query()->lazy(500)->map($pick(['id', 'team_id', 'lead_id', 'name', 'description', 'icon', 'color', 'status', 'priority', 'start_date', 'target_date', 'created_by', 'created_at', 'updated_at'])),
            ],
            'project_members' => [
                'count' => fn (): int => ProjectMember::query()->whereIn('project_id', $projectIds())->count(),
                'rows' => fn (): iterable => ProjectMember::query()->whereIn('project_id', $projectIds())->lazy(500)->map($pick(['project_id', 'user_id', 'created_at'])),
            ],
            // NOTE: milestones has target_date only — no due_date/completed_at/sort_order columns.
            'milestones' => [
                'count' => fn (): int => Milestone::query()->whereIn('project_id', $projectIds())->count(),
                'rows' => fn (): iterable => Milestone::query()->whereIn('project_id', $projectIds())->lazy(500)->map($pick(['id', 'project_id', 'name', 'target_date', 'created_at'])),
            ],
            'cycles' => [
                'count' => fn (): int => Cycle::query()->whereIn('team_id', $teamIds())->count(),
                'rows' => fn (): iterable => Cycle::query()->whereIn('team_id', $teamIds())->lazy(500)->map($pick(['id', 'team_id', 'name', 'starts_at', 'ends_at', 'created_at'])),
            ],
            'releases' => [
                'count' => fn (): int => Release::query()->count(),
                'rows' => fn (): iterable => Release::query()->lazy(500)->map($pick(['id', 'name', 'description', 'target_date', 'shipped_at', 'created_at', 'updated_at'])),
            ],
            'labels' => [
                'count' => fn (): int => Label::query()->count(),
                'rows' => fn (): iterable => Label::query()->lazy(500)->map($pick(['id', 'name', 'color', 'created_at'])),
            ],
            // NOTE: the JSONB column is `definition`, not `filters`.
            'saved_views' => [
                'count' => fn (): int => SavedView::query()->count(),
                'rows' => fn (): iterable => SavedView::query()->lazy(500)->map($pick(['id', 'name', 'definition', 'created_by', 'created_at'])),
            ],
            'tickets' => [
                'count' => fn (): int => Ticket::query()->count(),
                'rows' => fn (): iterable => Ticket::query()->lazy(500)->map($pick([
                    'id', 'requester_id', 'assignee_id', 'agent_group_id', 'sla_policy_id',
                    'subject', 'status', 'priority', 'channel', 'csat_rating', 'csat_responded_at',
                    'csat_requested_at', 'first_replied_at', 'first_reply_due_at', 'resolved_at',
                    'created_at', 'updated_at',
                ])),
            ],
            'ticket_messages' => [
                'count' => fn (): int => TicketMessage::query()->whereIn('ticket_id', $ticketIds())->count(),
                'rows' => fn (): iterable => TicketMessage::query()->whereIn('ticket_id', $ticketIds())->lazy(500)->map($pick(['id', 'ticket_id', 'sender_type', 'sender_user_id', 'sender_contact_id', 'body', 'is_internal', 'created_at'])),
            ],
            'tags' => [
                'count' => fn (): int => Tag::query()->count(),
                'rows' => fn (): iterable => Tag::query()->lazy(500)->map($pick(['id', 'name', 'created_at'])),
            ],
            'ticket_tags' => [
                'count' => fn (): int => TicketTag::query()->whereIn('ticket_id', $ticketIds())->count(),
                'rows' => fn (): iterable => TicketTag::query()->whereIn('ticket_id', $ticketIds())->lazy(500)->map($pick(['ticket_id', 'tag_id'])),
            ],
            'contacts' => [
                'count' => fn (): int => Contact::query()->count(),
                'rows' => fn (): iterable => Contact::query()->lazy(500)->map($pick(['id', 'name', 'email', 'phone', 'external_id', 'created_at'])),
            ],
            'contact_metadata' => [
                'count' => fn (): int => ContactMetadatum::query()->whereIn('contact_id', $contactIds())->count(),
                'rows' => fn (): iterable => ContactMetadatum::query()->whereIn('contact_id', $contactIds())->lazy(500)->map($pick(['contact_id', 'key', 'value'])),
            ],
            'agent_groups' => [
                'count' => fn (): int => AgentGroup::query()->count(),
                'rows' => fn (): iterable => AgentGroup::query()->lazy(500)->map($pick(['id', 'name', 'created_at'])),
            ],
            'agent_group_members' => [
                'count' => fn (): int => AgentGroupMember::query()->whereIn('agent_group_id', $groupIds())->count(),
                'rows' => fn (): iterable => AgentGroupMember::query()->whereIn('agent_group_id', $groupIds())->lazy(500)->map($pick(['agent_group_id', 'user_id'])),
            ],
            'sla_policies' => [
                'count' => fn (): int => SlaPolicy::query()->count(),
                'rows' => fn (): iterable => SlaPolicy::query()->lazy(500)->map($pick(['id', 'name', 'schedule_id', 'first_reply_minutes', 'next_reply_minutes', 'resolution_minutes', 'created_at'])),
            ],
            'business_hour_schedules' => [
                'count' => fn (): int => BusinessHourSchedule::query()->count(),
                'rows' => fn (): iterable => BusinessHourSchedule::query()->lazy(500)->map($pick(['id', 'name', 'timezone', 'created_at'])),
            ],
            // NOTE: real columns are id/opens_at/closes_at (not starts_at/ends_at); id was missing.
            'business_hour_intervals' => [
                'count' => fn (): int => BusinessHourInterval::query()->whereIn('schedule_id', $scheduleIds())->count(),
                'rows' => fn (): iterable => BusinessHourInterval::query()->whereIn('schedule_id', $scheduleIds())->lazy(500)->map($pick(['id', 'schedule_id', 'day_of_week', 'opens_at', 'closes_at'])),
            ],
            'sla_breaches' => [
                'count' => fn (): int => SlaBreach::query()->whereIn('ticket_id', $ticketIds())->count(),
                'rows' => fn (): iterable => SlaBreach::query()->whereIn('ticket_id', $ticketIds())->lazy(500)->map($pick(['id', 'ticket_id', 'metric', 'breached_at'])),
            ],
            'helpdesk_saved_views' => [
                'count' => fn (): int => HelpdeskSavedView::query()->count(),
                'rows' => fn (): iterable => HelpdeskSavedView::query()->lazy(500)->map($pick(['id', 'name', 'created_by', 'definition', 'created_at'])),
            ],
            'helpdesk_saved_reports' => [
                'count' => fn (): int => HelpdeskSavedReport::query()->count(),
                'rows' => fn (): iterable => HelpdeskSavedReport::query()->lazy(500)->map($pick(['id', 'name', 'created_by', 'definition', 'created_at'])),
            ],
        ];
    }
}
