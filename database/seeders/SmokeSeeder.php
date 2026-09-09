<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\BusinessHourSchedule;
use App\Models\Contact;
use App\Models\Cycle;
use App\Models\HelpdeskSavedReport;
use App\Models\HelpdeskSavedView;
use App\Models\Issue;
use App\Models\Notification;
use App\Models\Project;
use App\Models\SlaPolicy;
use App\Models\Tag;
use App\Models\Team;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Models\Workspace;
use App\Services\SlaCalculator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Idempotent seed for the Playwright smoke: a `smoke` workspace, a team, a
 * verified developer user, and one starter issue (so the list/board are
 * non-empty and a team_id is discoverable by the New-issue form).
 */
final class SmokeSeeder extends Seeder
{
    public function run(): void
    {
        $workspace = Workspace::withoutGlobalScopes()->firstWhere('slug', 'smoke')
            ?? Workspace::forceCreate(['id' => (string) Str::uuid(), 'name' => 'Smoke', 'slug' => 'smoke']);

        $workspace->makeCurrent();

        $team = Team::firstWhere('identifier', 'SMK')
            ?? Team::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $workspace->id, 'name' => 'Smoke Team', 'identifier' => 'SMK']);

        $user = User::firstWhere('email', 'smoke@example.com')
            ?? User::forceCreate([
                'id' => (string) Str::uuid(),
                'workspace_id' => $workspace->id,
                'name' => 'Smoke Dev',
                'email' => 'smoke@example.com',
                'password_hash' => Hash::make('password123'),
                'admin_level' => 'owner',
                'is_developer' => true,
                'email_verified_at' => now(),
            ]);

        // Ensure owner + developer regardless of how the user was previously seeded.
        $user->forceFill(['admin_level' => 'owner', 'is_developer' => true])->save();

        $member = User::firstWhere('email', 'member@example.com')
            ?? User::forceCreate([
                'id' => (string) Str::uuid(),
                'workspace_id' => $workspace->id,
                'name' => 'Smoke Member',
                'email' => 'member@example.com',
                'password_hash' => Hash::make('password123'),
                'admin_level' => 'member',
                'is_developer' => true,
                'is_agent' => false,
                'email_verified_at' => now(),
            ]);
        $member->forceFill(['admin_level' => 'member', 'is_developer' => true, 'is_agent' => false])->save();

        // Second member test account (distinct display name so it doesn't collide
        // with the "Smoke Member" e2e locator, which substring-matches).
        $member2 = User::firstWhere('email', 'member2@example.com')
            ?? User::forceCreate([
                'id' => (string) Str::uuid(),
                'workspace_id' => $workspace->id,
                'name' => 'Jordan Reeves',
                'email' => 'member2@example.com',
                'password_hash' => Hash::make('password123'),
                'admin_level' => 'member',
                'is_developer' => true,
                'is_agent' => false,
                'email_verified_at' => now(),
            ]);
        $member2->forceFill(['admin_level' => 'member', 'is_developer' => true, 'is_agent' => false])->save();

        // The team was `forceCreate`d above (bypassing CreateTeam), so ensure
        // membership explicitly: owner as lead, member as member. Idempotent.
        DB::table('team_members')->updateOrInsert(
            ['team_id' => $team->id, 'user_id' => $user->id],
            ['role' => 'lead'],
        );
        DB::table('team_members')->updateOrInsert(
            ['team_id' => $team->id, 'user_id' => $member->id],
            ['role' => 'member'],
        );
        DB::table('team_members')->updateOrInsert(
            ['team_id' => $team->id, 'user_id' => $member2->id],
            ['role' => 'member'],
        );

        if (Issue::doesntExist()) {
            Issue::forceCreate([
                'id' => (string) Str::uuid(),
                'workspace_id' => $workspace->id,
                'team_id' => $team->id,
                'created_by' => $user->id,
                'title' => 'Starter issue',
                'status' => 'todo',
                'priority' => 'no_priority',
            ]);
        }

        // Ensure a scheduled project exists so /projects shows a row and /roadmap
        // renders a bar. Guard on name to stay idempotent.
        $project = Project::withoutGlobalScopes()->firstWhere('name', 'Smoke Roadmap Project')
            ?? Project::forceCreate([
                'id' => (string) Str::uuid(),
                'workspace_id' => $workspace->id,
                'team_id' => $team->id,
                'lead_id' => $user->id,
                'created_by' => $user->id,
                'name' => 'Smoke Roadmap Project',
                'status' => 'in_progress',
                'priority' => 'medium',
                'color' => '#7C3AED',
                'start_date' => now()->subDays(10)->toDateString(),
                'target_date' => now()->addDays(20)->toDateString(),
            ]);

        // Add two issues linked to the project (one done, one todo) so the
        // progress bar is non-zero. Idempotent: only when the project has no issues.
        if ($project->issues()->count() === 0) {
            Issue::forceCreate([
                'id' => (string) Str::uuid(),
                'workspace_id' => $workspace->id,
                'team_id' => $team->id,
                'project_id' => $project->id,
                'created_by' => $user->id,
                'title' => 'Smoke project issue A (done)',
                'status' => 'done',
                'priority' => 'medium',
            ]);
            Issue::forceCreate([
                'id' => (string) Str::uuid(),
                'workspace_id' => $workspace->id,
                'team_id' => $team->id,
                'project_id' => $project->id,
                'created_by' => $user->id,
                'title' => 'Smoke project issue B (todo)',
                'status' => 'todo',
                'priority' => 'no_priority',
            ]);
        }

        // Analytics needs real completion timestamps: give every seeded done
        // issue a completed_at (forceCreate bypasses the stamping use cases).
        Issue::withoutGlobalScopes()
            ->where('workspace_id', $workspace->id)
            ->where('status', 'done')
            ->whereNull('completed_at')
            ->update(['completed_at' => now()->subDays(2)]);

        // A current cycle with mixed-status issues so /analytics → Cycles demos
        // velocity + a live burndown on a fresh `composer dev`.
        $cycle = Cycle::firstWhere([['team_id', $team->id], ['name', 'Smoke Cycle']])
            ?? Cycle::forceCreate([
                'id' => (string) Str::uuid(),
                'team_id' => $team->id,
                'name' => 'Smoke Cycle',
                'starts_at' => now()->subDays(7)->toDateString(),
                'ends_at' => now()->addDays(7)->toDateString(),
            ]);
        if (Issue::withoutGlobalScopes()->where('cycle_id', $cycle->id)->count() === 0) {
            $cycleIssues = [
                ['title' => 'Cycle issue 1', 'status' => 'done', 'completed_at' => now()->subDays(6)],
                ['title' => 'Cycle issue 2', 'status' => 'done', 'completed_at' => now()->subDays(4)],
                ['title' => 'Cycle issue 3', 'status' => 'done', 'completed_at' => now()->subDays(1)],
                ['title' => 'Cycle issue 4', 'status' => 'in_progress', 'completed_at' => null],
                ['title' => 'Cycle issue 5', 'status' => 'todo', 'completed_at' => null],
                ['title' => 'Cycle issue 6', 'status' => 'todo', 'completed_at' => null],
            ];
            foreach ($cycleIssues as $ci) {
                Issue::forceCreate([
                    'id' => (string) Str::uuid(),
                    'workspace_id' => $workspace->id,
                    'team_id' => $team->id,
                    'cycle_id' => $cycle->id,
                    'created_by' => $user->id,
                    'title' => $ci['title'],
                    'status' => $ci['status'],
                    'priority' => 'medium',
                    'completed_at' => $ci['completed_at'],
                ]);
            }
        }

        $issue = Issue::query()->first();
        if ($issue !== null && Notification::query()->where('user_id', $user->id)->doesntExist()) {
            Notification::forceCreate([
                'id' => (string) Str::uuid(),
                'workspace_id' => $workspace->id,
                'user_id' => $user->id,
                'type' => 'issue_assigned',
                'subject_type' => 'issue',
                'subject_id' => $issue->id,
            ]);
        }

        // Make the smoke owner an agent so the /support desk is reachable.
        $user->forceFill(['is_agent' => true])->save();

        $contact = Contact::withoutGlobalScopes()->firstWhere([['workspace_id', $workspace->id], ['email', 'grace@northwind.com']])
            ?? Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $workspace->id, 'name' => 'Grace Okonkwo', 'email' => 'grace@northwind.com']);
        DB::table('contact_metadata')->updateOrInsert(['contact_id' => $contact->id, 'key' => 'organization'], ['value' => 'Northwind Traders']);
        DB::table('contact_metadata')->updateOrInsert(['contact_id' => $contact->id, 'key' => 'plan'], ['value' => 'Enterprise']);

        $schedule = BusinessHourSchedule::withoutGlobalScopes()->firstWhere([['workspace_id', $workspace->id], ['name', 'Standard']])
            ?? BusinessHourSchedule::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $workspace->id, 'name' => 'Standard', 'timezone' => 'UTC']);
        if (DB::table('business_hour_intervals')->where('schedule_id', $schedule->id)->count() === 0) {
            foreach ([1, 2, 3, 4, 5] as $dow) {
                DB::table('business_hour_intervals')->insert(['id' => (string) Str::uuid(), 'schedule_id' => $schedule->id, 'day_of_week' => $dow, 'opens_at' => '09:00:00', 'closes_at' => '17:00:00']);
            }
        }
        $policy = SlaPolicy::withoutGlobalScopes()->firstWhere([['workspace_id', $workspace->id], ['name', 'Standard SLA']])
            ?? SlaPolicy::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $workspace->id, 'name' => 'Standard SLA', 'first_reply_minutes' => 60, 'resolution_minutes' => 480, 'schedule_id' => $schedule->id]);

        $ticket = Ticket::withoutGlobalScopes()->firstWhere([['workspace_id', $workspace->id], ['subject', 'Escalated issue shows blank customer profile']])
            ?? Ticket::forceCreate([
                'id' => (string) Str::uuid(), 'workspace_id' => $workspace->id, 'requester_id' => $contact->id,
                'assignee_id' => $user->id, 'subject' => 'Escalated issue shows blank customer profile',
                'status' => 'open', 'priority' => 'urgent', 'channel' => 'email',
                'sla_policy_id' => $policy->id, 'created_at' => now()->subHours(2), 'first_replied_at' => now()->subHour(),
            ]);
        // Idempotent backfill for a pre-existing escalation ticket from before HD-4a.
        if ($ticket->sla_policy_id === null) {
            $ticket->forceFill(['sla_policy_id' => $policy->id, 'first_replied_at' => $ticket->first_replied_at ?? now()->subHour()])->save();
        }
        if ($ticket->ticketMessages()->count() === 0) {
            DB::table('ticket_messages')->insert([
                ['id' => (string) Str::uuid(), 'ticket_id' => $ticket->id, 'sender_type' => 'contact', 'sender_user_id' => null, 'sender_contact_id' => $contact->id, 'body' => 'After escalation the engineering issue shows a blank customer profile.', 'is_internal' => false, 'channel' => 'email', 'created_at' => now()->subHours(2), 'updated_at' => now()->subHours(2)],
                ['id' => (string) Str::uuid(), 'ticket_id' => $ticket->id, 'sender_type' => 'user', 'sender_user_id' => $user->id, 'sender_contact_id' => null, 'body' => 'Thanks Grace — reproduced, escalating to engineering now.', 'is_internal' => false, 'channel' => 'email', 'created_at' => now()->subHours(1), 'updated_at' => now()->subHours(1)],
                ['id' => (string) Str::uuid(), 'ticket_id' => $ticket->id, 'sender_type' => 'user', 'sender_user_id' => $user->id, 'sender_contact_id' => null, 'body' => 'Internal: same convert path as the attachments bug.', 'is_internal' => true, 'channel' => 'email', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        $dueTicket = Ticket::withoutGlobalScopes()->firstWhere([['workspace_id', $workspace->id], ['subject', 'Cannot invite new agents — seat limit error']])
            ?? Ticket::forceCreate([
                'id' => (string) Str::uuid(), 'workspace_id' => $workspace->id, 'requester_id' => $contact->id,
                'assignee_id' => $user->id, 'subject' => 'Cannot invite new agents — seat limit error',
                'status' => 'new', 'priority' => 'high', 'channel' => 'chat',
                'sla_policy_id' => $policy->id, 'created_at' => now()->subMinutes(40),
            ]);

        $billing = Tag::withoutGlobalScopes()->firstWhere([['workspace_id', $workspace->id], ['name', 'billing']])
            ?? Tag::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $workspace->id, 'name' => 'billing', 'color' => '#5b8def']);
        if (DB::table('ticket_tags')->where(['ticket_id' => $dueTicket->id, 'tag_id' => $billing->id])->doesntExist()) {
            DB::table('ticket_tags')->insert(['ticket_id' => $dueTicket->id, 'tag_id' => $billing->id]);
        }

        // Extra agents so the reporting Agents table has more than one row (idempotent).
        $agentDefs = [
            ['name' => 'Maya Chen', 'email' => 'agent-maya@example.com'],
            ['name' => 'Sara Ito', 'email' => 'agent-sara@example.com'],
            ['name' => 'Devin Park', 'email' => 'agent-devin@example.com'],
        ];
        $agents = [$user]; // the owner is already is_agent
        foreach ($agentDefs as $def) {
            $a = User::firstWhere('email', $def['email'])
                ?? User::forceCreate([
                    'id' => (string) Str::uuid(),
                    'workspace_id' => $workspace->id,
                    'name' => $def['name'],
                    'email' => $def['email'],
                    'password_hash' => Hash::make('password123'),
                    'admin_level' => 'member',
                    'is_agent' => true,
                    'email_verified_at' => now(),
                ]);
            $a->forceFill(['is_agent' => true])->save();
            DB::table('team_members')->updateOrInsert(['team_id' => $team->id, 'user_id' => $a->id], ['role' => 'member']);
            $agents[] = $a;
        }

        // Tiered SLA policies so the reporting attainment donut + by-plan breakdown compare plans (idempotent).
        $tierDefs = [['name' => 'Enterprise SLA', 'min' => 60], ['name' => 'Business SLA', 'min' => 240], ['name' => 'Startup SLA', 'min' => 480]];
        $tierPolicies = [];
        foreach ($tierDefs as $d) {
            $tierPolicies[] = SlaPolicy::withoutGlobalScopes()->firstWhere([['workspace_id', $workspace->id], ['name', $d['name']]])
                ?? SlaPolicy::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $workspace->id, 'name' => $d['name'],
                    'first_reply_minutes' => $d['min'], 'resolution_minutes' => 480, 'schedule_id' => $schedule->id]);
        }

        // A small tag catalog so the reporting tag chips are non-trivial (idempotent).
        $tagCatalog = [];
        foreach (['bug', 'billing', 'how-to', 'sso', 'export'] as $tn) {
            $tagCatalog[] = Tag::withoutGlobalScopes()->firstWhere([['workspace_id', $workspace->id], ['name', $tn]])
                ?? Tag::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $workspace->id, 'name' => $tn, 'color' => '#5b8def']);
        }

        // Historical tickets so /support/reporting has real numbers (idempotent: only when sparse).
        if (Ticket::where('workspace_id', $workspace->id)->count() < 20) {
            $issue = Issue::where('workspace_id', $workspace->id)->first();
            $statuses = ['new', 'open', 'pending', 'on_hold', 'solved', 'closed'];
            $channels = ['email', 'chat', 'portal', 'api'];
            $priorities = ['low', 'normal', 'high', 'urgent'];
            for ($i = 0; $i < 40; $i++) {
                $daysAgo = (int) (($i * 90) / 40);                 // 0..~89, spread across the quarter
                $createdAt = $daysAgo === 0 ? now()->subHours(3) : now()->subDays($daysAgo)->setTime(9 + ($i % 8), ($i * 7) % 60);
                $status = $statuses[$i % 6];
                $isSolved = in_array($status, ['solved', 'closed'], true);
                $replied = $i % 10 !== 0;                          // ~90% replied
                $t = Ticket::forceCreate([
                    'id' => (string) Str::uuid(), 'workspace_id' => $workspace->id, 'requester_id' => $contact->id,
                    'assignee_id' => $agents[$i % count($agents)]->id,
                    'subject' => 'Historical ticket #'.($i + 1),
                    'status' => $status, 'priority' => $priorities[$i % 4], 'channel' => $channels[$i % 4],
                    'sla_policy_id' => $tierPolicies[$i % 3]->id,
                    'created_at' => $createdAt,
                    'first_replied_at' => $replied ? $createdAt->copy()->addMinutes(5 + ($i % 12) * 6) : null,
                    'resolved_at' => $isSolved ? $createdAt->copy()->addHours(2 + ($i % 10)) : null,
                    'first_reply_due_at' => SlaCalculator::dueAt($createdAt, $tierPolicies[$i % 3]->first_reply_minutes, $schedule),
                ]);

                if ($i % 2 === 0) {
                    DB::table('ticket_tags')->insert(['ticket_id' => $t->id, 'tag_id' => $tagCatalog[$i % count($tagCatalog)]->id]);
                }

                $assignee = $agents[$i % count($agents)];

                // An agent public reply for every replied ticket → drives replies-per-day + agent activity.
                if ($replied) {
                    TicketMessage::forceCreate([
                        'id' => (string) Str::uuid(), 'ticket_id' => $t->id, 'sender_type' => 'user', 'sender_user_id' => $assignee->id,
                        'body' => 'Thanks for reaching out — taking a look now.', 'is_internal' => false, 'channel' => $t->channel,
                        'created_at' => $t->first_replied_at,
                    ]);
                    if ($i % 4 === 0) { // some internal notes too
                        TicketMessage::forceCreate([
                            'id' => (string) Str::uuid(), 'ticket_id' => $t->id, 'sender_type' => 'user', 'sender_user_id' => $assignee->id,
                            'body' => 'Internal: escalating if no repro by EOD.', 'is_internal' => true, 'channel' => $t->channel,
                            'created_at' => $t->first_replied_at->copy()->addMinutes(3),
                        ]);
                    }
                }

                // CSAT on most solved tickets (~85% positive), responded shortly after resolution.
                if ($isSolved && $i % 5 !== 0) {
                    $t->forceFill([
                        'csat_rating' => $i % 7 === 0 ? 'thumbs_down' : 'thumbs_up',
                        'csat_responded_at' => $t->resolved_at?->copy()->addMinutes(30),
                    ])->save();
                }

                if ($issue !== null && $i % 7 === 0) {             // ~15% escalated
                    DB::table('issue_ticket_links')->insert(['issue_id' => $issue->id, 'ticket_id' => $t->id, 'created_by' => $user->id]);
                }
            }

            // A few open, unreplied tickets so the reporting breach-risk queue is non-empty.
            for ($j = 0; $j < 4; $j++) {
                $dueTicketCreatedAt = now()->subMinutes(10 + $j * 10); // 10/20/30/40 min ago, unreplied
                Ticket::forceCreate([
                    'id' => (string) Str::uuid(), 'workspace_id' => $workspace->id, 'requester_id' => $contact->id,
                    'assignee_id' => $agents[$j % count($agents)]->id,
                    'subject' => 'Awaiting first reply #'.($j + 1),
                    'status' => $j % 2 === 0 ? 'new' : 'open', 'priority' => 'high', 'channel' => $channels[$j % 4],
                    'sla_policy_id' => $tierPolicies[$j % 3]->id,
                    'created_at' => $dueTicketCreatedAt,
                    'first_reply_due_at' => SlaCalculator::dueAt($dueTicketCreatedAt, $tierPolicies[$j % 3]->first_reply_minutes, $schedule),
                ]);
            }
        }

        $demoViews = [
            ['name' => 'Urgent · unassigned', 'definition' => ['filter' => ['status' => 'new,open,pending,on_hold', 'assignee_id' => 'none'], 'sort' => 'sla_due']],
            ['name' => 'Email backlog', 'definition' => ['filter' => ['channel' => 'email', 'status' => 'new,open,pending,on_hold'], 'sort' => 'created_at']],
        ];
        foreach ($demoViews as $dv) {
            $exists = HelpdeskSavedView::withoutGlobalScopes()
                ->where('workspace_id', $workspace->id)
                ->where('name', $dv['name'])
                ->exists();
            if (! $exists) {
                HelpdeskSavedView::forceCreate([
                    'id' => (string) Str::uuid(),
                    'workspace_id' => $workspace->id,
                    'name' => $dv['name'],
                    'created_by' => $user->id,
                    'definition' => $dv['definition'],
                ]);
            }
        }

        $demoReports = [
            ['name' => 'Weekly overview', 'definition' => ['section' => 'overview', 'range' => '7d']],
            ['name' => 'Quarterly SLA', 'definition' => ['section' => 'sla', 'range' => '90d']],
        ];
        foreach ($demoReports as $dr) {
            $exists = HelpdeskSavedReport::withoutGlobalScopes()
                ->where('workspace_id', $workspace->id)
                ->where('name', $dr['name'])
                ->exists();
            if (! $exists) {
                HelpdeskSavedReport::forceCreate([
                    'id' => (string) Str::uuid(),
                    'workspace_id' => $workspace->id,
                    'name' => $dr['name'],
                    'created_by' => $user->id,
                    'definition' => $dr['definition'],
                ]);
            }
        }

        Workspace::forgetCurrent();
        $this->command?->info('Smoke workspace ready (slug=smoke, user=smoke@example.com / password123).');
    }
}
