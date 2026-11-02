<?php

declare(strict_types=1);

use App\Jobs\PurgeWorkspace;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

// A deleted workspace closes at once and a queued job erases it. Every hour,
// workspaces:purge-deleted queues that job again for any closed over an hour
// ago and still there, so a lost or failing job cannot leave its data behind.

/** A workspace with one member, closed $minutesAgo minutes ago, or live when null. */
function purgeSeed(string $slug, ?int $minutesAgo): Workspace
{
    $workspace = Workspace::factory()->create(['slug' => $slug]);
    $workspace->makeCurrent();
    User::factory()->for($workspace, 'workspace')->create();
    Workspace::forgetCurrent();

    if ($minutesAgo !== null) {
        $workspace->forceFill(['deleted_at' => now()->subMinutes($minutesAgo)])->save();
    }

    return $workspace;
}

it('queues the erasing again for a workspace closed over an hour ago, once', function (): void {
    Queue::fake();
    $stale = purgeSeed('stale', 61);

    $this->artisan('workspaces:purge-deleted')->assertExitCode(0);
    // An hour later, the first job still waiting: no second copy behind it.
    $this->artisan('workspaces:purge-deleted')->assertExitCode(0);

    Queue::assertPushed(PurgeWorkspace::class, 1);
    Queue::assertPushed(PurgeWorkspace::class, fn (PurgeWorkspace $job): bool => $job->workspaceId === $stale->id);
});

it('leaves a workspace closed within the hour to its own job, and a live one alone', function (): void {
    Queue::fake();
    purgeSeed('recent', 59);
    purgeSeed('live', null);

    $this->artisan('workspaces:purge-deleted')->assertExitCode(0);

    Queue::assertNothingPushed();
});

it('erases the workspace with everything in it', function (): void {
    $stale = purgeSeed('stale', 61);
    $live = purgeSeed('live', null);

    $this->artisan('workspaces:purge-deleted')->assertExitCode(0);

    expect(Workspace::withTrashed()->find($stale->id))->toBeNull()
        ->and(DB::table('users')->where('workspace_id', $stale->id)->count())->toBe(0)
        ->and(Workspace::query()->find($live->id))->not->toBeNull()
        ->and(DB::table('users')->where('workspace_id', $live->id)->count())->toBe(1);
});

it('runs every hour', function (): void {
    // withSchedule() registers its events when Artisan starts, so start it.
    $this->artisan('schedule:list')->expectsOutputToContain('workspaces:purge-deleted')->assertExitCode(0);

    $event = collect(app(Schedule::class)->events())
        ->first(fn ($event): bool => str_contains((string) $event->command, 'workspaces:purge-deleted'));

    expect($event?->expression)->toBe('0 * * * *');
});
