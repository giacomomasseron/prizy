<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\Tag;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} */
function ticketFilterWorld(array $userAttrs = ['is_agent' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

function filterTicket(Workspace $ws, array $attrs): Ticket
{
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'C', 'email' => 'c'.Str::uuid().'@x.com']);

    return Ticket::forceCreate(array_merge([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'requester_id' => $contact->id,
        'subject' => 'S', 'status' => 'open', 'priority' => 'high', 'channel' => 'email',
    ], $attrs));
}

it('filters tickets by status', function (): void {
    [$token, $ws] = ticketFilterWorld();
    filterTicket($ws, ['status' => 'open']);
    filterTicket($ws, ['status' => 'solved']);

    $res = $this->withToken($token)->getJson('/v1/tickets?filter[status]=open')->assertStatus(200);
    expect($res->json('data'))->toHaveCount(1);
    expect($res->json('data.0.status'))->toBe('open');

    Workspace::forgetCurrent();
});

it('filters by channel', function (): void {
    [$token, $ws] = ticketFilterWorld();
    filterTicket($ws, ['channel' => 'email']);
    filterTicket($ws, ['channel' => 'chat']);

    $res = $this->withToken($token)->getJson('/v1/tickets?filter[channel]=chat')->assertStatus(200);
    expect($res->json('data'))->toHaveCount(1);
    expect($res->json('data.0.channel'))->toBe('chat');

    Workspace::forgetCurrent();
});

it('filters unassigned tickets via the none sentinel', function (): void {
    [$token, $ws, $user] = ticketFilterWorld();
    filterTicket($ws, ['assignee_id' => $user->id]);
    filterTicket($ws, ['assignee_id' => null]);

    $res = $this->withToken($token)->getJson('/v1/tickets?filter[assignee_id]=none')->assertStatus(200);
    expect($res->json('data'))->toHaveCount(1);
    expect($res->json('data.0.assignee'))->toBeNull();

    Workspace::forgetCurrent();
});

it('filters by assignee id', function (): void {
    [$token, $ws, $user] = ticketFilterWorld();
    filterTicket($ws, ['assignee_id' => $user->id]);
    filterTicket($ws, ['assignee_id' => null]);

    $res = $this->withToken($token)->getJson("/v1/tickets?filter[assignee_id]={$user->id}")->assertStatus(200);
    expect($res->json('data'))->toHaveCount(1);
    expect($res->json('data.0.assignee.id'))->toBe($user->id);

    Workspace::forgetCurrent();
});

it('filters by tag via the junction and exposes the tag id', function (): void {
    [$token, $ws] = ticketFilterWorld();
    $tagged = filterTicket($ws, []);
    $untagged = filterTicket($ws, []);
    $tag = Tag::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'billing', 'color' => '#5b8def']);
    DB::table('ticket_tags')->insert(['ticket_id' => $tagged->id, 'tag_id' => $tag->id]);

    $res = $this->withToken($token)->getJson("/v1/tickets?filter[tag_id]={$tag->id}")->assertStatus(200);
    expect($res->json('data'))->toHaveCount(1);
    expect($res->json('data.0.id'))->toBe($tagged->id);
    expect($res->json('data.0.tags.0.id'))->toBe($tag->id);
    expect($res->json('data.0.tags.0.name'))->toBe('billing');

    Workspace::forgetCurrent();
});

it('combines status and channel with AND', function (): void {
    [$token, $ws] = ticketFilterWorld();
    filterTicket($ws, ['status' => 'open', 'channel' => 'chat']);
    filterTicket($ws, ['status' => 'open', 'channel' => 'email']);
    filterTicket($ws, ['status' => 'solved', 'channel' => 'chat']);

    $res = $this->withToken($token)->getJson('/v1/tickets?filter[status]=open&filter[channel]=chat')->assertStatus(200);
    expect($res->json('data'))->toHaveCount(1);

    Workspace::forgetCurrent();
});

it('rejects an unknown filter key (422)', function (): void {
    [$token, $ws] = ticketFilterWorld();
    filterTicket($ws, []);

    $this->withToken($token)->getJson('/v1/tickets?filter[bogus]=x')->assertStatus(422);

    Workspace::forgetCurrent();
});

it('still isolates workspaces under a filter', function (): void {
    [$token, $wsA] = ticketFilterWorld();
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();
    filterTicket($wsB, ['status' => 'open']);
    $wsA->makeCurrent();

    $res = $this->withToken($token)->getJson('/v1/tickets?filter[status]=open')->assertStatus(200);
    expect($res->json('data'))->toHaveCount(0);

    Workspace::forgetCurrent();
});

it('rejects a non-string (array) filter value (422)', function (): void {
    [$token, $ws] = ticketFilterWorld();
    filterTicket($ws, []);

    // filter[status][]=a → an array value, not a CSV string.
    $this->withToken($token)->getJson('/v1/tickets?filter[status][]=open')->assertStatus(422);

    Workspace::forgetCurrent();
});

it('forbids a non-agent from listing tickets (403)', function (): void {
    [$token, $ws] = ticketFilterWorld(['is_agent' => false, 'admin_level' => 'owner']);
    filterTicket($ws, []);

    $this->withToken($token)->getJson('/v1/tickets?filter[status]=open')->assertStatus(403);

    Workspace::forgetCurrent();
});
