<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\Label;
use App\Models\Project;
use App\Models\Release;
use App\Models\Team;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/**
 * @param  array<string,mixed>  $flags
 * @return array{0:string,1:Workspace,2:User}
 */
function exportWorld(array $flags = ['admin_level' => 'owner']): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $flags));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

/** Seed one row in each spot-checked entity; returns [issueTitle, ticketSubject]. */
function exportFixtures(Workspace $ws, User $owner): array
{
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'team_id' => $team->id,
        'created_by' => $owner->id, 'title' => 'Exported issue', 'status' => 'done',
        'priority' => 'medium', 'completed_at' => now()->subDay(),
    ]);
    IssueComment::forceCreate([
        'id' => (string) Str::uuid(), 'issue_id' => $issue->id, 'user_id' => $owner->id,
        'body' => 'Exported comment',
    ]);
    Label::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'export-label', 'color' => '#ff0000']);
    Project::factory()->for($ws, 'workspace')->create();
    Release::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Export v1']);
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Grace', 'email' => 'grace@northwind.com']);
    $ticket = Ticket::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'requester_id' => $contact->id,
        'subject' => 'Exported ticket', 'status' => 'open', 'priority' => 'normal', 'channel' => 'email',
    ]);
    TicketMessage::forceCreate([
        'id' => (string) Str::uuid(), 'ticket_id' => $ticket->id,
        'sender_type' => 'contact', 'sender_contact_id' => $contact->id, 'body' => 'Exported message',
        'channel' => 'email',
    ]);

    return ['Exported issue', 'Exported ticket'];
}

/** Downloads the export and returns the bytes. */
function exportZipBytes(string $token): string
{
    // getJson() (not get()) so the 'verified' middleware's 403 path takes the
    // expectsJson() branch instead of attempting a route('verification.notice')
    // redirect that doesn't exist in this API-only app; the Accept header has
    // no effect on the binary ZIP body served below.
    $response = test()->withToken($token)->getJson('/v1/workspace-export');
    $response->assertOk();

    // response()->download() is a BinaryFileResponse with deleteFileAfterSend:
    // sendContent() streams the file and THEN deletes it — capture via output buffer.
    ob_start();
    $response->baseResponse->sendContent();

    return (string) ob_get_clean();
}

function exportOpenZip(string $bytes): ZipArchive
{
    $tmp = tempnam(sys_get_temp_dir(), 'export-test');
    file_put_contents($tmp, $bytes);
    $zip = new ZipArchive;
    expect($zip->open($tmp))->toBeTrue();

    return $zip;
}

it('exports a valid zip for the owner with manifest, content, and no secrets', function (): void {
    [$token, $ws, $owner] = exportWorld();
    [$issueTitle] = exportFixtures($ws, $owner);

    $response = test()->withToken($token)->getJson('/v1/workspace-export');
    $response->assertOk();
    expect($response->headers->get('content-disposition'))->toContain("prizy-export-{$ws->slug}-");

    $zip = exportOpenZip(exportZipBytes($token));

    $manifest = json_decode((string) $zip->getFromName('manifest.json'), true);
    expect($manifest['workspace']['slug'])->toBe($ws->slug);
    expect($manifest['exported_at'])->toBeString();
    expect($manifest['counts']['issues'])->toBe(1);
    expect($manifest['counts']['tickets'])->toBe(1);
    expect($manifest['counts']['releases'])->toBe(1);

    $issues = json_decode((string) $zip->getFromName('issues.json'), true);
    expect($issues)->toHaveCount(1);
    expect($issues[0]['title'])->toBe($issueTitle);
    expect($issues[0])->toHaveKeys(['id', 'team_id', 'status', 'completed_at', 'release_id', 'created_at']);

    $members = json_decode((string) $zip->getFromName('members.json'), true);
    expect($members)->not->toBeEmpty();
    foreach ($members as $m) {
        expect($m)->not->toHaveKey('password');
        expect($m)->not->toHaveKey('remember_token');
        expect($m)->toHaveKeys(['id', 'name', 'email', 'admin_level', 'is_developer', 'is_agent', 'verified']);
    }

    foreach (['notifications.json', 'personal_access_tokens.json', 'github_integrations.json', 'invitations.json', 'oauth_identities.json'] as $absent) {
        expect($zip->getFromName($absent))->toBeFalse();
    }

    $zip->close();
    Workspace::forgetCurrent();
});

it('isolates workspaces', function (): void {
    [$token, $ws, $owner] = exportWorld();
    exportFixtures($ws, $owner);

    // Foreign workspace with its own issue (RLS-context sandwich).
    Workspace::forgetCurrent();
    $foreign = Workspace::factory()->create();
    $foreign->makeCurrent();
    $fTeam = Team::factory()->for($foreign, 'workspace')->create();
    $fUser = User::factory()->for($foreign, 'workspace')->create();
    Issue::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $foreign->id, 'team_id' => $fTeam->id,
        'created_by' => $fUser->id, 'title' => 'Foreign secret issue', 'status' => 'todo', 'priority' => 'low',
    ]);
    Workspace::forgetCurrent();
    test()->actingInWorkspace($ws);

    $zip = exportOpenZip(exportZipBytes($token));
    $issuesJson = (string) $zip->getFromName('issues.json');
    expect($issuesJson)->toContain('Exported issue');
    expect($issuesJson)->not->toContain('Foreign secret issue');

    $zip->close();
    Workspace::forgetCurrent();
});

it('403s every non-owner role', function (): void {
    foreach ([
        ['admin_level' => 'admin'],
        ['admin_level' => 'member', 'is_developer' => true],
        ['admin_level' => 'viewer'],
        ['admin_level' => 'member', 'is_agent' => true],
    ] as $flags) {
        [$token] = exportWorld($flags);
        test()->withToken($token)->getJson('/v1/workspace-export')->assertStatus(403);
        Workspace::forgetCurrent();
        test()->flushSession();
    }
});

it('403s an unverified owner', function (): void {
    [$token] = exportWorld(['admin_level' => 'owner', 'email_verified_at' => null]);
    test()->withToken($token)->getJson('/v1/workspace-export')->assertStatus(403);
    Workspace::forgetCurrent();
});

it('exports an empty workspace as a valid zip with zero counts', function (): void {
    [$token] = exportWorld();

    $zip = exportOpenZip(exportZipBytes($token));
    $manifest = json_decode((string) $zip->getFromName('manifest.json'), true);
    expect($manifest['counts']['issues'])->toBe(0);
    expect(json_decode((string) $zip->getFromName('issues.json'), true))->toBe([]);

    $zip->close();
    Workspace::forgetCurrent();
});
