<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Workspace;
use App\Notifications\WorkspaceLinks;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

// Login lives on each workspace's own host, so someone who forgot theirs asks
// the sign-up host to email them the list. The answer never says whether the
// address has any workspace.

beforeEach(function (): void {
    config([
        'app.url'         => 'https://prizy.test',
        'app.base_domain' => 'prizy.test',
        'app.signup_host' => 'signup.prizy.test',
    ]);
    Notification::fake();
});

function findWorkspacesPost(string $email, string $ip = '198.51.100.80'): TestResponse
{
    return test()->withServerVariables(['REMOTE_ADDR' => $ip])
        ->postJson('https://signup.prizy.test/find-workspaces', ['email' => $email]);
}

function findWorkspacesMember(array $workspaceAttributes, string $email, array $userAttributes = []): Workspace
{
    $workspace = Workspace::factory()->create($workspaceAttributes);
    $workspace->makeCurrent();
    User::factory()->for($workspace, 'workspace')->create(['email' => $email, ...$userAttributes]);
    Workspace::forgetCurrent();

    return $workspace;
}

const FIND_WORKSPACES_REPLY = "If that address belongs to any workspace, we've emailed you the links.";

it('emails the login link of every live workspace the address belongs to', function (): void {
    findWorkspacesMember(['slug' => 'beta', 'name' => 'Beta Ltd'], 'sam@example.com');
    findWorkspacesMember(['slug' => 'acme', 'name' => 'Acme Corp'], 'Sam@Example.com');
    findWorkspacesMember(['slug' => 'other', 'name' => 'Other Inc'], 'someone@example.com');

    findWorkspacesPost('SAM@example.com')->assertStatus(202)->assertJsonPath('message', FIND_WORKSPACES_REPLY);

    Notification::assertSentOnDemand(WorkspaceLinks::class, function (WorkspaceLinks $n, array $channels, AnonymousNotifiable $to): bool {
        expect($to->routes['mail'])->toBe('SAM@example.com')
            ->and($n->workspaces)->toBe([
                ['name' => 'Acme Corp', 'url' => 'https://acme.prizy.test/login'],
                ['name' => 'Beta Ltd', 'url' => 'https://beta.prizy.test/login'],
            ]);

        $text = implode(' ', $n->toMail($to)->introLines);
        expect($text)->toContain('Acme Corp: https://acme.prizy.test/login');

        return true;
    });
    Notification::assertSentOnDemandTimes(WorkspaceLinks::class, 1);
});

it('leaves out pending, deleted and departed-member workspaces', function (): void {
    findWorkspacesMember(['slug' => 'live', 'name' => 'Live'], 'sam@example.com');
    findWorkspacesMember(['slug' => 'pending', 'name' => 'Pending', 'activated_at' => null], 'sam@example.com');
    findWorkspacesMember(['slug' => 'gone', 'name' => 'Gone'], 'sam@example.com')->delete();
    findWorkspacesMember(['slug' => 'left', 'name' => 'Left'], 'sam@example.com', ['deleted_at' => now()]);

    findWorkspacesPost('sam@example.com')->assertStatus(202);

    Notification::assertSentOnDemand(WorkspaceLinks::class, fn (WorkspaceLinks $n): bool => array_column($n->workspaces, 'name') === ['Live']);
});

it('answers the same for an address with no workspace, and sends nothing', function (): void {
    findWorkspacesPost('nobody@example.com')->assertStatus(202)->assertJsonPath('message', FIND_WORKSPACES_REPLY);

    Notification::assertNothingSent();
});

it('refuses a malformed address', function (): void {
    findWorkspacesPost('not-an-email')->assertStatus(422)->assertJsonValidationErrors(['email']);
});

it('allows five requests an hour from one address', function (): void {
    $ip = '198.51.100.81';

    for ($i = 1; $i <= 5; $i++) {
        findWorkspacesPost("try{$i}@example.com", $ip)->assertStatus(202);
    }

    findWorkspacesPost('try6@example.com', $ip)->assertStatus(429);

    $this->travel(2)->minutes();
    findWorkspacesPost('try7@example.com', $ip)->assertStatus(429);

    $this->travel(60)->minutes();
    findWorkspacesPost('try8@example.com', $ip)->assertStatus(202);
});
