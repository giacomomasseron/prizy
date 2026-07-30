<?php

declare(strict_types=1);

use App\Models\Contact;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

/** @return array{0:string,1:Workspace,2:User} */
function contactCreateWorld(array $userAttrs = ['is_agent' => true]): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

afterEach(fn () => Workspace::forgetCurrent());

it('creates a contact', function (): void {
    [$token, $ws] = contactCreateWorld();
    $res = $this->withToken($token)->postJson('/v1/contacts', ['name' => 'Ada Byron', 'email' => 'ada@x.com', 'phone' => '+15551234'])->assertStatus(201);
    expect($res->json('data.name'))->toBe('Ada Byron');
    expect($res->json('data.email'))->toBe('ada@x.com');
    expect(Contact::where('workspace_id', $ws->id)->where('email', 'ada@x.com')->exists())->toBeTrue();
});

it('rejects a duplicate email within the workspace (422) but allows it in another', function (): void {
    [$token, $ws] = contactCreateWorld();
    $this->withToken($token)->postJson('/v1/contacts', ['name' => 'A', 'email' => 'dup@x.com'])->assertStatus(201);
    $this->withToken($token)->postJson('/v1/contacts', ['name' => 'B', 'email' => 'dup@x.com'])->assertStatus(422);

    // same email in another workspace is allowed
    $other = Workspace::factory()->create();
    $other->makeCurrent();
    $u2 = User::factory()->for($other, 'workspace')->create(['is_agent' => true, 'email_verified_at' => now()]);
    $t2 = app(CreatePersonalAccessToken::class)->handle($u2, 't', null)['token'];
    // The dual auth:token,web stack runs EnsureValidTenantSession, which binds the
    // PHP session to the FIRST tenant it sees and 401s on a later mismatch (session
    // fixation guard — see TenantSessionMiddlewareTest). The Pest test client's
    // in-memory session persists across postJson() calls in the same test, so it
    // still holds $ws's id from the first request; re-seed it to $other's id here
    // (same fix as that test's "session tenant matches current tenant" case) so this
    // assertion is only exercising per-workspace email uniqueness, not that guard.
    $this->withSession(['ensure_valid_tenant_session_tenant_id' => $other->id])
        ->withToken($t2)->postJson('/v1/contacts', ['name' => 'C', 'email' => 'dup@x.com'])->assertStatus(201);
});

it('forbids a non-agent (403)', function (): void {
    [$token] = contactCreateWorld(['is_agent' => false, 'admin_level' => 'owner']);
    $this->withToken($token)->postJson('/v1/contacts', ['name' => 'A', 'email' => 'a@x.com'])->assertStatus(403);
});

it('validates name and email (422)', function (): void {
    [$token] = contactCreateWorld();
    $this->withToken($token)->postJson('/v1/contacts', ['name' => '', 'email' => 'a@x.com'])->assertStatus(422);
    $this->withToken($token)->postJson('/v1/contacts', ['name' => 'A', 'email' => 'not-an-email'])->assertStatus(422);
});
