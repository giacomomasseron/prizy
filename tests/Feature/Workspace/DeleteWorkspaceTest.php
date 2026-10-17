<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\WorkspaceDeleted;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Database\Seeders\SmokeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

// An owner deletes their workspace from Settings → General, after typing its
// name. Everything in it goes at once, and every owner is told by email.

beforeEach(function (): void {
    config(['app.url' => 'https://prizy.test', 'app.base_domain' => 'prizy.test']);
    Notification::fake();
});

/** @return array{0: Workspace, 1: User} */
function deletionWorld(string $level = 'owner', array $userAttributes = []): array
{
    $workspace = Workspace::factory()->create(['name' => 'Acme Corp', 'slug' => 'acme']);
    test()->actingInWorkspace($workspace);
    $user = User::factory()->for($workspace, 'workspace')->create([
        'name'              => 'Olive Owner',
        'email'             => 'olive@example.com',
        'admin_level'       => $level,
        'email_verified_at' => now(),
        ...$userAttributes,
    ]);

    return [$workspace, $user];
}

/** Rows in every table of the schema, keyed by table, with no workspace current (RLS then shows them all). */
function deletionTableCounts(): array
{
    Workspace::forgetCurrent();
    $framework = ['migrations', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs'];
    $counts = [];
    foreach (DB::select('SELECT tablename FROM pg_tables WHERE schemaname = current_schema() ORDER BY tablename') as $table) {
        if (! in_array($table->tablename, $framework, true)) {
            $counts[$table->tablename] = DB::table($table->tablename)->count();
        }
    }

    return $counts;
}

it('deletes the workspace with everything in it', function (): void {
    [$workspace, $owner] = deletionWorld();
    $member = User::factory()->for($workspace, 'workspace')->create();
    $team = Team::factory()->for($workspace, 'workspace')->create();
    $issue = Issue::factory()->for($workspace, 'workspace')->create(['team_id' => $team->id, 'created_by' => $member->id]);
    // A comment is deleted through its issue, a step after its author: the
    // order that needs the deferred foreign keys.
    DB::table('issue_comments')->insert(['id' => (string) Str::uuid(), 'issue_id' => $issue->id, 'user_id' => $member->id, 'body' => 'On it.']);

    $this->actingAs($owner)->deleteJson('/v1/workspace', ['confirm' => 'Acme Corp'])->assertNoContent();

    Workspace::forgetCurrent();
    expect(Workspace::withTrashed()->find($workspace->id))->toBeNull()
        ->and(DB::table('users')->where('workspace_id', $workspace->id)->count())->toBe(0)
        ->and(DB::table('teams')->where('workspace_id', $workspace->id)->count())->toBe(0)
        ->and(DB::table('issues')->where('workspace_id', $workspace->id)->count())->toBe(0)
        ->and(DB::table('issue_comments')->where('issue_id', $issue->id)->count())->toBe(0);
});

it('tells every owner, and nobody else, who deleted the workspace and when', function (): void {
    [$workspace, $owner] = deletionWorld();
    User::factory()->for($workspace, 'workspace')->create(['email' => 'co-owner@example.com', 'admin_level' => 'owner']);
    User::factory()->for($workspace, 'workspace')->create(['email' => 'admin@example.com', 'admin_level' => 'admin']);
    $this->travelTo('2026-10-17 09:30:00');

    $this->actingAs($owner)->deleteJson('/v1/workspace', ['confirm' => 'Acme Corp'])->assertNoContent();

    $sentTo = [];
    Notification::assertSentOnDemand(WorkspaceDeleted::class, function (WorkspaceDeleted $n, array $channels, AnonymousNotifiable $to) use (&$sentTo): bool {
        $sentTo[] = $to->routes['mail'];
        expect(implode(' ', $n->toMail($to)->introLines))
            ->toContain('Olive Owner (olive@example.com) deleted the Prizy workspace Acme Corp (acme.prizy.test) on 17 October 2026 at 09:30 UTC.')
            ->toContain('its address is free again');

        return true;
    });
    sort($sentTo);
    expect($sentTo)->toBe(['co-owner@example.com', 'olive@example.com']);
});

it('refuses anyone but an owner, whatever they send', function (string $level): void {
    [$workspace, $user] = deletionWorld($level);

    $this->actingAs($user)->deleteJson('/v1/workspace')->assertForbidden();
    $this->actingAs($user)->deleteJson('/v1/workspace', ['confirm' => 'Acme Corp'])->assertForbidden();

    expect(Workspace::query()->find($workspace->id))->not->toBeNull();
    Notification::assertNothingSent();
})->with(['admin', 'member', 'viewer']);

it('refuses a confirmation that is not the exact name', function (string $typed): void {
    [$workspace, $owner] = deletionWorld();

    $this->actingAs($owner)->deleteJson('/v1/workspace', ['confirm' => $typed])
        ->assertStatus(422)
        ->assertJsonPath('errors.confirm.0', 'Type the workspace name exactly as shown to confirm.');

    expect(Workspace::query()->find($workspace->id))->not->toBeNull();
})->with(['the address' => 'acme', 'another case' => 'acme corp', 'a prefix' => 'Acme']);

it('refuses a request with no confirmation', function (): void {
    [$workspace, $owner] = deletionWorld();

    $this->actingAs($owner)->deleteJson('/v1/workspace')->assertStatus(422)->assertJsonValidationErrors('confirm');

    expect(Workspace::query()->find($workspace->id))->not->toBeNull();
});

it("refuses an API token, even the owner's", function (): void {
    [$workspace, $owner] = deletionWorld();
    $token = app(CreatePersonalAccessToken::class)->handle($owner, 't', null)['token'];

    $this->withToken($token)->deleteJson('/v1/workspace', ['confirm' => 'Acme Corp'])->assertUnauthorized();

    expect(Workspace::query()->find($workspace->id))->not->toBeNull();
});

it('refuses an owner whose email is not verified', function (): void {
    [$workspace, $owner] = deletionWorld(userAttributes: ['email_verified_at' => null]);

    $this->actingAs($owner)->deleteJson('/v1/workspace', ['confirm' => 'Acme Corp'])->assertForbidden();

    expect(Workspace::query()->find($workspace->id))->not->toBeNull();
});

it('finishes the deletion when the email cannot be sent', function (): void {
    [$workspace, $owner] = deletionWorld();
    Notification::shouldReceive('send')->once()->andThrow(new RuntimeException('SMTP is down'));

    $this->actingAs($owner)->deleteJson('/v1/workspace', ['confirm' => 'Acme Corp'])->assertNoContent();

    Workspace::forgetCurrent();
    expect(Workspace::withTrashed()->find($workspace->id))->toBeNull();
});

// The deferred keys are checked before the transaction ends, not at COMMIT,
// which a test never reaches: a reference from another workspace still fails
// the deletion here, and leaves everything as it was.
it('refuses, and keeps everything, while another workspace still names one of its users', function (): void {
    [$workspace, $owner] = deletionWorld();
    $other = Workspace::factory()->create(['name' => 'Other', 'slug' => 'other']);
    $other->makeCurrent();
    $team = Team::factory()->for($other, 'workspace')->create();
    Issue::factory()->for($other, 'workspace')->create(['team_id' => $team->id, 'created_by' => $owner->id]);
    $this->actingInWorkspace($workspace);

    $this->actingAs($owner)->deleteJson('/v1/workspace', ['confirm' => 'Acme Corp'])->assertStatus(500);

    Workspace::forgetCurrent();
    expect(Workspace::query()->find($workspace->id))->not->toBeNull()
        ->and(DB::table('users')->where('id', $owner->id)->exists())->toBeTrue();
    Notification::assertNothingSent();
});

it('deletes a workspace full of data and leaves every other workspace as it was', function (): void {
    $other = Workspace::factory()->create(['name' => 'Other', 'slug' => 'other']);
    $other->makeCurrent();
    $otherUser = User::factory()->for($other, 'workspace')->create();
    $otherTeam = Team::factory()->for($other, 'workspace')->create();
    Issue::factory()->for($other, 'workspace')->create(['team_id' => $otherTeam->id, 'created_by' => $otherUser->id]);
    $before = deletionTableCounts();

    $this->seed(SmokeSeeder::class);
    $smoke = Workspace::query()->where('slug', 'smoke')->sole();
    $this->actingInWorkspace($smoke);
    $owner = User::query()->where('email', 'smoke@example.com')->sole();
    expect(DB::table('issues')->count())->toBeGreaterThan(1);

    $this->actingAs($owner)->deleteJson('/v1/workspace', ['confirm' => 'Smoke'])->assertNoContent();

    expect(deletionTableCounts())->toBe($before);
});

it("shows any member the workspace's name, address and size", function (): void {
    [$workspace, $member] = deletionWorld('member');
    User::factory()->for($workspace, 'workspace')->create();
    Team::factory()->for($workspace, 'workspace')->count(3)->create();

    $this->actingAs($member)->getJson('/v1/workspace')
        ->assertOk()
        ->assertJsonPath('data.name', 'Acme Corp')
        ->assertJsonPath('data.slug', 'acme')
        ->assertJsonPath('data.member_count', 2)
        ->assertJsonPath('data.team_count', 3);
});
