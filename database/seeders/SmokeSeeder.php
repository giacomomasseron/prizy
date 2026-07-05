<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Issue;
use App\Models\Notification;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Seeder;
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

        Workspace::forgetCurrent();
        $this->command?->info("Smoke workspace ready (slug=smoke, user=smoke@example.com / password123).");
    }
}
