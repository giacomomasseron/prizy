<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Issue;
use App\Models\Team;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/**
 * Create a workspace-member user with the given role and capability flags.
 */
function mkUser(Workspace $ws, string $level, bool $dev, bool $agent): User
{
    return User::factory()->for($ws, 'workspace')->create([
        'admin_level'  => $level,
        'is_developer' => $dev,
        'is_agent'     => $agent,
    ]);
}

// ---------------------------------------------------------------------------
// IssuePolicy — 16 combos × 5 abilities = 80 assertions
// ---------------------------------------------------------------------------

it('IssuePolicy: sweeps all 16 admin_level × is_developer × is_agent combos', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();

    $team    = Team::factory()->for($ws, 'workspace')->create();
    $creator = mkUser($ws, 'owner', false, false);
    $issue   = Issue::create(['team_id' => $team->id, 'title' => 'T', 'created_by' => $creator->id]);

    // [level, dev, agent, viewAny, view, create, update, delete]
    // Rules:
    //   owner → Gate::before short-circuits (always T)
    //   create/update/delete → is_developer=true AND admin_level != 'viewer'
    //   viewAny/view → any member (incl. viewer)
    //   view/update/delete (model) → also requires same workspace_id
    $matrix = [
        // --- owner (Gate::before short-circuit) ---
        ['owner',  false, false, true,  true,  true,  true,  true],
        ['owner',  true,  false, true,  true,  true,  true,  true],
        ['owner',  false, true,  true,  true,  true,  true,  true],
        ['owner',  true,  true,  true,  true,  true,  true,  true],
        // --- admin ---
        ['admin',  false, false, true,  true,  false, false, false],
        ['admin',  true,  false, true,  true,  true,  true,  true],
        ['admin',  false, true,  true,  true,  false, false, false],
        ['admin',  true,  true,  true,  true,  true,  true,  true],
        // --- member ---
        ['member', false, false, true,  true,  false, false, false],
        ['member', true,  false, true,  true,  true,  true,  true],
        ['member', false, true,  true,  true,  false, false, false],
        ['member', true,  true,  true,  true,  true,  true,  true],
        // --- viewer (can read; NEVER writes even with is_developer) ---
        ['viewer', false, false, true,  true,  false, false, false],
        ['viewer', true,  false, true,  true,  false, false, false],
        ['viewer', false, true,  true,  true,  false, false, false],
        ['viewer', true,  true,  true,  true,  false, false, false],
    ];

    foreach ($matrix as [$level, $dev, $agent, $viewAny, $view, $create, $update, $delete]) {
        $tag  = "$level dev=$dev agent=$agent";
        $user = mkUser($ws, $level, $dev, $agent);

        expect($user->can('viewAny', Issue::class))->toBe($viewAny, "viewAny @ $tag");
        expect($user->can('view',    $issue))->toBe($view,    "view @ $tag");
        expect($user->can('create',  Issue::class))->toBe($create,  "create @ $tag");
        expect($user->can('update',  $issue))->toBe($update,  "update @ $tag");
        expect($user->can('delete',  $issue))->toBe($delete,  "delete @ $tag");
    }

    Workspace::forgetCurrent();
});

it('IssuePolicy: denies an owner of ws-A from instance abilities on models in ws-B (Gate::before cross-ws guard)', function (): void {
    $ws1 = Workspace::factory()->create();
    $ws2 = Workspace::factory()->create();

    $ws1->makeCurrent();
    $team1    = Team::factory()->for($ws1, 'workspace')->create();
    $creator1 = mkUser($ws1, 'owner', true, true);
    $issue1   = Issue::create(['team_id' => $team1->id, 'title' => 'WS1 Issue', 'created_by' => $creator1->id]);
    Workspace::forgetCurrent();

    // Owner in ws2 must be denied ALL instance-level abilities on ws1 models
    // (the workspace-bounded Gate::before must return false, not true).
    $ws2->makeCurrent();
    $ownerWs2 = mkUser($ws2, 'owner', false, false);

    expect($ownerWs2->can('view',   $issue1))->toBeFalse('owner cross-ws view');
    expect($ownerWs2->can('update', $issue1))->toBeFalse('owner cross-ws update');
    expect($ownerWs2->can('delete', $issue1))->toBeFalse('owner cross-ws delete');

    // Class-level abilities (no model argument) are still allowed for an owner
    // within their own workspace (Gate::before returns true when $model is null).
    expect($ownerWs2->can('viewAny', Issue::class))->toBeTrue('owner class-level viewAny still allowed');
    expect($ownerWs2->can('create',  Issue::class))->toBeTrue('owner class-level create still allowed');

    Workspace::forgetCurrent();
});

it('IssuePolicy: denies model abilities across workspace boundary', function (): void {
    $ws1 = Workspace::factory()->create();
    $ws2 = Workspace::factory()->create();

    $ws1->makeCurrent();
    $team1    = Team::factory()->for($ws1, 'workspace')->create();
    $creator1 = mkUser($ws1, 'owner', true, true);
    $issue1   = Issue::create(['team_id' => $team1->id, 'title' => 'A', 'created_by' => $creator1->id]);
    Workspace::forgetCurrent();

    // A user in ws2 with full capabilities should not access ws1 models.
    $ws2->makeCurrent();
    $superUser = mkUser($ws2, 'admin', true, true);

    expect($superUser->can('view',   $issue1))->toBeFalse('cross-ws view');
    expect($superUser->can('update', $issue1))->toBeFalse('cross-ws update');
    expect($superUser->can('delete', $issue1))->toBeFalse('cross-ws delete');

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// TicketPolicy — 16 combos × 4 abilities = 64 assertions
// ---------------------------------------------------------------------------

it('TicketPolicy: sweeps all 16 admin_level × is_developer × is_agent combos', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();

    // Explicit UUIDs needed: $incrementing=false means Eloquent won't fetch the DB-generated UUID.
    $contact = Contact::create(['id' => (string) Str::uuid(), 'name' => 'Req', 'email' => 'req@test.com']);
    $ticket  = Ticket::create(['id' => (string) Str::uuid(), 'requester_id' => $contact->id, 'subject' => 'T', 'channel' => 'email']);

    // [level, dev, agent, viewAny, view, reply, manage]
    // Rules:
    //   owner → Gate::before short-circuit (always T)
    //   reply/manage → is_agent=true AND admin_level != 'viewer'
    //   viewAny/view → any member (incl. viewer)
    $matrix = [
        // --- owner ---
        ['owner',  false, false, true,  true,  true,  true],
        ['owner',  true,  false, true,  true,  true,  true],
        ['owner',  false, true,  true,  true,  true,  true],
        ['owner',  true,  true,  true,  true,  true,  true],
        // --- admin ---
        ['admin',  false, false, true,  true,  false, false],
        ['admin',  true,  false, true,  true,  false, false],
        ['admin',  false, true,  true,  true,  true,  true],
        ['admin',  true,  true,  true,  true,  true,  true],
        // --- member ---
        ['member', false, false, true,  true,  false, false],
        ['member', true,  false, true,  true,  false, false],
        ['member', false, true,  true,  true,  true,  true],
        ['member', true,  true,  true,  true,  true,  true],
        // --- viewer (NEVER writes even with is_agent) ---
        ['viewer', false, false, true,  true,  false, false],
        ['viewer', true,  false, true,  true,  false, false],
        ['viewer', false, true,  true,  true,  false, false],
        ['viewer', true,  true,  true,  true,  false, false],
    ];

    foreach ($matrix as [$level, $dev, $agent, $viewAny, $view, $reply, $manage]) {
        $tag  = "$level dev=$dev agent=$agent";
        $user = mkUser($ws, $level, $dev, $agent);

        expect($user->can('viewAny', Ticket::class))->toBe($viewAny, "viewAny @ $tag");
        expect($user->can('view',    $ticket))->toBe($view,   "view @ $tag");
        expect($user->can('reply',   $ticket))->toBe($reply,  "reply @ $tag");
        expect($user->can('manage',  $ticket))->toBe($manage, "manage @ $tag");
    }

    Workspace::forgetCurrent();
});

it('TicketPolicy: denies model abilities across workspace boundary', function (): void {
    $ws1 = Workspace::factory()->create();
    $ws2 = Workspace::factory()->create();

    $ws1->makeCurrent();
    $contact1 = Contact::create(['id' => (string) Str::uuid(), 'name' => 'R', 'email' => 'r@ws1.com']);
    $ticket1  = Ticket::create(['id' => (string) Str::uuid(), 'requester_id' => $contact1->id, 'subject' => 'X', 'channel' => 'email']);
    Workspace::forgetCurrent();

    $ws2->makeCurrent();
    $superUser = mkUser($ws2, 'admin', true, true);

    expect($superUser->can('view',   $ticket1))->toBeFalse('cross-ws view');
    expect($superUser->can('reply',  $ticket1))->toBeFalse('cross-ws reply');
    expect($superUser->can('manage', $ticket1))->toBeFalse('cross-ws manage');

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// WorkspacePolicy — 16 combos × 3 abilities = 48 assertions
// ---------------------------------------------------------------------------

it('WorkspacePolicy: sweeps all 16 admin_level × is_developer × is_agent combos', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();

    // [level, dev, agent, updateSettings, manageBilling, delete]
    // Rules:
    //   owner → Gate::before short-circuit (always T)
    //   updateSettings → admin_level ∈ {admin, owner}
    //   manageBilling / delete → admin_level = 'owner' only
    $matrix = [
        // --- owner ---
        ['owner',  false, false, true,  true,  true],
        ['owner',  true,  false, true,  true,  true],
        ['owner',  false, true,  true,  true,  true],
        ['owner',  true,  true,  true,  true,  true],
        // --- admin ---
        ['admin',  false, false, true,  false, false],
        ['admin',  true,  false, true,  false, false],
        ['admin',  false, true,  true,  false, false],
        ['admin',  true,  true,  true,  false, false],
        // --- member ---
        ['member', false, false, false, false, false],
        ['member', true,  false, false, false, false],
        ['member', false, true,  false, false, false],
        ['member', true,  true,  false, false, false],
        // --- viewer ---
        ['viewer', false, false, false, false, false],
        ['viewer', true,  false, false, false, false],
        ['viewer', false, true,  false, false, false],
        ['viewer', true,  true,  false, false, false],
    ];

    foreach ($matrix as [$level, $dev, $agent, $updateSettings, $manageBilling, $delete]) {
        $tag  = "$level dev=$dev agent=$agent";
        $user = mkUser($ws, $level, $dev, $agent);

        expect($user->can('updateSettings', $ws))->toBe($updateSettings, "updateSettings @ $tag");
        expect($user->can('manageBilling',  $ws))->toBe($manageBilling,  "manageBilling @ $tag");
        expect($user->can('delete',         $ws))->toBe($delete,         "delete @ $tag");
    }

    Workspace::forgetCurrent();
});

// ---------------------------------------------------------------------------
// MemberPolicy — 16 combos × 2 abilities = 32 assertions
// ---------------------------------------------------------------------------

it('MemberPolicy: sweeps all 16 admin_level × is_developer × is_agent combos', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();

    // A target member (the User being operated on for changeRole)
    $targetMember = mkUser($ws, 'member', false, false);

    // [level, dev, agent, invite, changeRole]
    // Rules:
    //   owner → Gate::before short-circuit (always T)
    //   invite / changeRole → admin_level ∈ {admin, owner}
    $matrix = [
        // --- owner ---
        ['owner',  false, false, true,  true],
        ['owner',  true,  false, true,  true],
        ['owner',  false, true,  true,  true],
        ['owner',  true,  true,  true,  true],
        // --- admin ---
        ['admin',  false, false, true,  true],
        ['admin',  true,  false, true,  true],
        ['admin',  false, true,  true,  true],
        ['admin',  true,  true,  true,  true],
        // --- member ---
        ['member', false, false, false, false],
        ['member', true,  false, false, false],
        ['member', false, true,  false, false],
        ['member', true,  true,  false, false],
        // --- viewer ---
        ['viewer', false, false, false, false],
        ['viewer', true,  false, false, false],
        ['viewer', false, true,  false, false],
        ['viewer', true,  true,  false, false],
    ];

    foreach ($matrix as [$level, $dev, $agent, $invite, $changeRole]) {
        $tag  = "$level dev=$dev agent=$agent";
        $user = mkUser($ws, $level, $dev, $agent);

        expect($user->can('invite',     User::class))->toBe($invite,     "invite @ $tag");
        expect($user->can('changeRole', $targetMember))->toBe($changeRole, "changeRole @ $tag");
    }

    Workspace::forgetCurrent();
});

it('MemberPolicy: denies changeRole across workspace boundary', function (): void {
    $ws1 = Workspace::factory()->create();
    $ws2 = Workspace::factory()->create();

    $ws1->makeCurrent();
    $memberInWs1 = mkUser($ws1, 'member', false, false);
    Workspace::forgetCurrent();

    $ws2->makeCurrent();
    $adminInWs2 = mkUser($ws2, 'admin', true, true);

    // Admin in ws2 cannot change role of a user who belongs to ws1.
    expect($adminInWs2->can('changeRole', $memberInWs1))->toBeFalse('cross-ws changeRole');

    Workspace::forgetCurrent();
});
