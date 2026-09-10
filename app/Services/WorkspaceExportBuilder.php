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
 * through their workspace-scoped parents via a whereIn(...,
 * ParentModel::query()->select('id')) SUBQUERY — never a materialized id
 * list — so WorkspaceScope/RLS applies to the subquery itself and we never
 * build a 65k+ bound-parameter IN-list.
 *
 * Memory: each entity's JSON array is streamed row-by-row directly to its own
 * disk-backed temp file (never buffered in a PHP string), then registered
 * into the zip via addFile(). libzip only reads part files at close() time,
 * so part paths must survive until after a successful (or failed) close().
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

        $partPaths = [];

        try {
            $entities = $this->entities($workspace);

            $counts = [];
            foreach ($entities as $name => $rows) {
                $partPath = tempnam(sys_get_temp_dir(), 'prizy-export-part');
                if ($partPath === false) {
                    throw new RuntimeException('Unable to allocate a temp file for an export entity.');
                }
                $partPaths[] = $partPath;

                $counts[$name] = $this->writeEntityPart($partPath, $rows());

                if (! $zip->addFile($partPath, "{$name}.json")) {
                    throw new RuntimeException(sprintf('Unable to add %s.json to the export archive.', $name));
                }
            }

            // Manifest last: counts are only known once every entity has streamed.
            // Archive entry order doesn't matter for a zip reader.
            $zip->addFromString('manifest.json', (string) json_encode([
                'workspace' => ['id' => $workspace->id, 'name' => $workspace->name, 'slug' => $workspace->slug],
                'exported_at' => now()->toISOString(),
                'app_version' => (string) config('app.version', 'dev'),
                'counts' => $counts,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            if (! $zip->close()) {
                throw new RuntimeException('Unable to finalize the export archive.');
            }
        } catch (\Throwable $e) {
            try {
                $zip->unchangeAll();
                $zip->close();
            } catch (\Throwable) {
                // A close warning here must never skip the part-file cleanup below.
            }
            foreach ($partPaths as $partPath) {
                @unlink($partPath);
            }
            @unlink($path);
            throw $e;
        }

        // Part files are only safe to remove after a SUCCESSFUL close() — libzip
        // defers reading addFile()'d paths until close() time.
        foreach ($partPaths as $partPath) {
            @unlink($partPath);
        }

        chmod($path, 0600);

        return [
            'path' => $path,
            'filename' => sprintf('prizy-export-%s-%s.zip', $workspace->slug, now()->format('Y-m-d')),
        ];
    }

    /**
     * Streams one entity's rows into its own disk-backed temp file as a JSON
     * array, one row at a time, without ever holding the whole payload in a
     * PHP string. Returns the row count (folded into the manifest counts).
     *
     * @param  iterable<int, array<string, mixed>>  $rows
     */
    private function writeEntityPart(string $path, iterable $rows): int
    {
        $stream = fopen($path, 'wb');
        if ($stream === false) {
            throw new RuntimeException('Unable to open an export part file.');
        }

        fwrite($stream, '[');
        $count = 0;
        foreach ($rows as $row) {
            fwrite($stream, ($count === 0 ? '' : ',')."\n  ".json_encode($row, JSON_UNESCAPED_SLASHES));
            $count++;
        }
        fwrite($stream, "\n]");
        fclose($stream);

        return $count;
    }

    private function iso(mixed $value): mixed
    {
        return $value instanceof CarbonInterface ? $value->toISOString() : $value;
    }

    /**
     * The allowlist: entity name → fn(): iterable<array<string,mixed>>.
     * Column lists are explicit; verify each against the model AND the
     * migration before changing — the $pick guard below throws loudly if a
     * listed column doesn't exist on the loaded row, but only for entities
     * that actually have at least one row in a given export.
     *
     * @return array<string, callable(): iterable<int, array<string, mixed>>>
     */
    private function entities(Workspace $workspace): array
    {
        // getAttributes() returns the raw loaded-column map; every entity here
        // loads full rows (no ->select() narrowing), so a missing key means the
        // column name in the list below is wrong — fail loudly instead of
        // silently exporting null/omitting the field.
        $pick = fn (array $columns) => function (object $m) use ($columns): array {
            $attributes = $m->getAttributes();
            $row = [];
            foreach ($columns as $c) {
                if (! array_key_exists($c, $attributes)) {
                    throw new RuntimeException(sprintf('Export column %s missing on %s', $c, $m::class));
                }
                $row[$c] = $this->iso($m->{$c});
            }

            return $row;
        };

        return [
            'workspace' => fn (): iterable => [
                ['id' => $workspace->id, 'name' => $workspace->name, 'slug' => $workspace->slug, 'created_at' => $this->iso($workspace->created_at), 'updated_at' => $this->iso($workspace->updated_at)],
            ],
            'teams' => fn (): iterable => Team::query()->lazyById(500)->map($pick(['id', 'name', 'identifier', 'color', 'created_at', 'updated_at'])),
            'team_members' => fn (): iterable => TeamMember::query()
                ->whereIn('team_id', Team::query()->select('id'))
                ->orderBy('team_id')->orderBy('user_id')
                ->lazy(500)->map($pick(['team_id', 'user_id', 'role', 'created_at'])),
            'members' => fn (): iterable => User::query()->lazyById(500)->map(fn (User $u): array => [
                'id' => $u->id, 'name' => $u->name, 'email' => $u->email,
                'admin_level' => $u->admin_level, 'is_developer' => (bool) $u->is_developer,
                'is_agent' => (bool) $u->is_agent, 'verified' => $u->email_verified_at !== null,
                'created_at' => $this->iso($u->created_at),
            ]),
            'issues' => fn (): iterable => Issue::query()->lazyById(500)->map($pick([
                'id', 'team_id', 'project_id', 'cycle_id', 'release_id', 'parent_issue_id',
                'assignee_id', 'created_by', 'title', 'description', 'status', 'priority',
                'estimate', 'due_date', 'sort_order', 'source', 'completed_at', 'archived_at',
                'created_at', 'updated_at',
            ])),
            'issue_comments' => fn (): iterable => IssueComment::query()
                ->whereIn('issue_id', Issue::query()->select('id'))
                ->lazyById(500)->map($pick(['id', 'issue_id', 'user_id', 'body', 'is_internal', 'edited_at', 'created_at', 'updated_at'])),
            // NOTE: issue_comment_reactions has NO issue_id column — only issue_comment_id.
            // Scope through the comment ids of in-workspace issues (nested subquery).
            'issue_comment_reactions' => fn (): iterable => IssueCommentReaction::query()
                ->whereIn('issue_comment_id', IssueComment::query()->whereIn('issue_id', Issue::query()->select('id'))->select('id'))
                ->lazyById(500)->map($pick(['id', 'issue_comment_id', 'user_id', 'emoji', 'created_at', 'updated_at'])),
            'issue_activities' => fn (): iterable => IssueActivity::query()
                ->whereIn('issue_id', Issue::query()->select('id'))
                ->lazyById(500)->map($pick(['id', 'issue_id', 'user_id', 'type', 'from_value', 'to_value', 'created_at'])),
            'issue_labels' => fn (): iterable => IssueLabel::query()
                ->whereIn('issue_id', Issue::query()->select('id'))
                ->orderBy('issue_id')->orderBy('label_id')
                ->lazy(500)->map($pick(['issue_id', 'label_id'])),
            // NOTE: columns are blocking_issue_id/blocked_issue_id/created_by (not issue_id/blocked_by_issue_id).
            'issue_blockers' => fn (): iterable => IssueBlocker::query()
                ->whereIn('blocking_issue_id', Issue::query()->select('id'))
                ->orderBy('blocking_issue_id')->orderBy('blocked_issue_id')
                ->lazy(500)->map($pick(['blocking_issue_id', 'blocked_issue_id', 'created_by', 'created_at'])),
            // NOTE: real columns are repo/number/source/created_by (not kind/external_id).
            'issue_github_links' => fn (): iterable => IssueGithubLink::query()
                ->whereIn('issue_id', Issue::query()->select('id'))
                ->lazyById(500)->map($pick(['id', 'issue_id', 'repo', 'number', 'url', 'title', 'state', 'source', 'created_by', 'created_at', 'updated_at'])),
            'issue_ticket_links' => fn (): iterable => IssueTicketLink::query()
                ->whereIn('issue_id', Issue::query()->select('id'))
                ->orderBy('issue_id')->orderBy('ticket_id')
                ->lazy(500)->map($pick(['issue_id', 'ticket_id', 'created_by', 'created_at'])),
            'projects' => fn (): iterable => Project::query()->lazyById(500)->map($pick(['id', 'team_id', 'lead_id', 'name', 'description', 'icon', 'color', 'status', 'priority', 'start_date', 'target_date', 'created_by', 'created_at', 'updated_at'])),
            'project_members' => fn (): iterable => ProjectMember::query()
                ->whereIn('project_id', Project::query()->select('id'))
                ->orderBy('project_id')->orderBy('user_id')
                ->lazy(500)->map($pick(['project_id', 'user_id', 'created_at'])),
            // NOTE: milestones has target_date only — no due_date/completed_at/sort_order columns.
            'milestones' => fn (): iterable => Milestone::query()
                ->whereIn('project_id', Project::query()->select('id'))
                ->lazyById(500)->map($pick(['id', 'project_id', 'name', 'target_date', 'created_at', 'updated_at'])),
            'cycles' => fn (): iterable => Cycle::query()
                ->whereIn('team_id', Team::query()->select('id'))
                ->lazyById(500)->map($pick(['id', 'team_id', 'name', 'starts_at', 'ends_at', 'cooldown_days', 'description', 'created_at', 'updated_at'])),
            'releases' => fn (): iterable => Release::query()->lazyById(500)->map($pick(['id', 'name', 'description', 'target_date', 'shipped_at', 'created_at', 'updated_at'])),
            'labels' => fn (): iterable => Label::query()->lazyById(500)->map($pick(['id', 'name', 'color', 'group', 'created_at', 'updated_at'])),
            // NOTE: the JSONB column is `definition`, not `filters`.
            'saved_views' => fn (): iterable => SavedView::query()->lazyById(500)->map($pick(['id', 'name', 'definition', 'created_by', 'created_at', 'updated_at'])),
            'tickets' => fn (): iterable => Ticket::query()->lazyById(500)->map($pick([
                'id', 'requester_id', 'assignee_id', 'agent_group_id', 'sla_policy_id',
                'subject', 'status', 'priority', 'channel', 'csat_rating', 'csat_responded_at',
                'csat_requested_at', 'first_replied_at', 'first_reply_due_at', 'resolved_at',
                'created_at', 'updated_at',
            ])),
            'ticket_messages' => fn (): iterable => TicketMessage::query()
                ->whereIn('ticket_id', Ticket::query()->select('id'))
                ->lazyById(500)->map($pick(['id', 'ticket_id', 'sender_type', 'sender_user_id', 'sender_contact_id', 'body', 'is_internal', 'channel', 'created_at', 'updated_at'])),
            'tags' => fn (): iterable => Tag::query()->lazyById(500)->map($pick(['id', 'name', 'color', 'created_at'])),
            'ticket_tags' => fn (): iterable => TicketTag::query()
                ->whereIn('ticket_id', Ticket::query()->select('id'))
                ->orderBy('ticket_id')->orderBy('tag_id')
                ->lazy(500)->map($pick(['ticket_id', 'tag_id'])),
            'contacts' => fn (): iterable => Contact::query()->lazyById(500)->map($pick(['id', 'name', 'email', 'phone', 'external_id', 'created_at', 'updated_at'])),
            'contact_metadata' => fn (): iterable => ContactMetadatum::query()
                ->whereIn('contact_id', Contact::query()->select('id'))
                ->orderBy('contact_id')->orderBy('key')
                ->lazy(500)->map($pick(['contact_id', 'key', 'value'])),
            'agent_groups' => fn (): iterable => AgentGroup::query()->lazyById(500)->map($pick(['id', 'name', 'created_at', 'updated_at'])),
            'agent_group_members' => fn (): iterable => AgentGroupMember::query()
                ->whereIn('agent_group_id', AgentGroup::query()->select('id'))
                ->orderBy('agent_group_id')->orderBy('user_id')
                ->lazy(500)->map($pick(['agent_group_id', 'user_id'])),
            'sla_policies' => fn (): iterable => SlaPolicy::query()->lazyById(500)->map($pick(['id', 'name', 'schedule_id', 'first_reply_minutes', 'next_reply_minutes', 'resolution_minutes', 'created_at', 'updated_at'])),
            'business_hour_schedules' => fn (): iterable => BusinessHourSchedule::query()->lazyById(500)->map($pick(['id', 'name', 'timezone', 'created_at', 'updated_at'])),
            // NOTE: real columns are id/opens_at/closes_at (not starts_at/ends_at); id was missing.
            'business_hour_intervals' => fn (): iterable => BusinessHourInterval::query()
                ->whereIn('schedule_id', BusinessHourSchedule::query()->select('id'))
                ->lazyById(500)->map($pick(['id', 'schedule_id', 'day_of_week', 'opens_at', 'closes_at'])),
            'sla_breaches' => fn (): iterable => SlaBreach::query()
                ->whereIn('ticket_id', Ticket::query()->select('id'))
                ->lazyById(500)->map($pick(['id', 'ticket_id', 'metric', 'breached_at'])),
            'helpdesk_saved_views' => fn (): iterable => HelpdeskSavedView::query()->lazyById(500)->map($pick(['id', 'name', 'created_by', 'definition', 'created_at', 'updated_at'])),
            'helpdesk_saved_reports' => fn (): iterable => HelpdeskSavedReport::query()->lazyById(500)->map($pick(['id', 'name', 'created_by', 'definition', 'created_at', 'updated_at'])),
        ];
    }
}
