<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// A workspace nobody activated within 24 hours is deleted outright, owner and
// all, so a typo'd email or a junk sign-up frees its address again.

function pruneSeed(array $attributes): array
{
    $workspace = Workspace::factory()->create($attributes);
    $workspace->makeCurrent();
    $owner = User::factory()->for($workspace, 'workspace')->create(['admin_level' => 'owner', 'email_verified_at' => null]);
    Workspace::forgetCurrent();

    return [$workspace, $owner];
}

function pruneExists(Workspace $workspace, User $owner): bool
{
    $hasWorkspace = Workspace::withTrashed()->whereKey($workspace->id)->exists();
    $hasOwner = User::withoutGlobalScopes()->whereKey($owner->id)->exists();
    expect($hasOwner)->toBe($hasWorkspace);

    return $hasWorkspace;
}

it('deletes a workspace still pending after 24 hours, together with its owner', function (): void {
    [$workspace, $owner] = pruneSeed(['slug' => 'stale', 'activated_at' => null, 'created_at' => now()->subHours(25)]);

    $this->artisan('workspaces:prune-pending')->assertExitCode(0);

    expect(pruneExists($workspace, $owner))->toBeFalse();
});

it('frees the address, so the same slug can sign up again', function (): void {
    pruneSeed(['slug' => 'stale', 'activated_at' => null, 'created_at' => now()->subHours(25)]);
    $this->artisan('workspaces:prune-pending')->assertExitCode(0);

    $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.40'])->postJson('/workspaces', [
        'workspace_name' => 'Stale Again',
        'slug'           => 'stale',
        'name'           => 'Alice',
        'email'          => 'alice@stale.example',
        'password'       => 'password123',
    ])->assertStatus(201);
});

it('keeps a pending workspace younger than 24 hours', function (): void {
    [$workspace, $owner] = pruneSeed(['slug' => 'fresh', 'activated_at' => null, 'created_at' => now()->subHours(23)]);

    $this->artisan('workspaces:prune-pending')->assertExitCode(0);

    expect(pruneExists($workspace, $owner))->toBeTrue();
});

it('keeps a live workspace however old it is', function (): void {
    [$workspace, $owner] = pruneSeed(['slug' => 'old', 'activated_at' => now()->subDays(30), 'created_at' => now()->subDays(30)]);

    $this->artisan('workspaces:prune-pending')->assertExitCode(0);

    expect(pruneExists($workspace, $owner))->toBeTrue();
});

it('runs every hour', function (): void {
    $this->artisan('schedule:list')
        ->expectsOutputToContain('workspaces:prune-pending')
        ->expectsOutputToContain('0 * * * *')
        ->assertExitCode(0);
});
