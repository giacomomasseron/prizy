<?php

declare(strict_types=1);

use App\Models\Contact;
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
function contactWorld(array $userAttrs): array
{
    $ws = Workspace::factory()->create();
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create(array_merge(['email_verified_at' => now()], $userAttrs));
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    return [$token, $ws, $user];
}

/** @param array<string,string> $meta */
function seedContact(Workspace $ws, string $name = 'Grace Okonkwo', string $email = 'grace@northwind.com', array $meta = ['organization' => 'Northwind Traders', 'plan' => 'Enterprise']): Contact
{
    $contact = Contact::forceCreate(['id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => $name, 'email' => $email]);
    foreach ($meta as $key => $value) {
        DB::table('contact_metadata')->insert(['contact_id' => $contact->id, 'key' => $key, 'value' => $value]);
    }

    return $contact;
}

it('lists contacts for an agent with org and plan', function (): void {
    [$token, $ws] = contactWorld(['is_agent' => true]);
    seedContact($ws);

    $this->withToken($token)->getJson('/v1/contacts')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Grace Okonkwo')
        ->assertJsonPath('data.0.email', 'grace@northwind.com')
        ->assertJsonPath('data.0.org', 'Northwind Traders')
        ->assertJsonPath('data.0.plan', 'Enterprise');

    Workspace::forgetCurrent();
});

it('forbids a non-agent from listing contacts (403)', function (): void {
    [$token, $ws] = contactWorld(['is_agent' => false, 'admin_level' => 'owner']); // even an owner is blocked
    seedContact($ws);

    $this->withToken($token)->getJson('/v1/contacts')->assertStatus(403);

    Workspace::forgetCurrent();
});

it('does not leak contacts from another workspace', function (): void {
    [$token, $wsA] = contactWorld(['is_agent' => true]);
    $wsB = Workspace::factory()->create();
    $wsB->makeCurrent();                          // seed wsB under its own RLS/GUC context
    seedContact($wsB, 'Other Person', 'other@elsewhere.com', []);
    $wsA->makeCurrent();                          // restore actor tenant

    $this->withToken($token)->getJson('/v1/contacts')->assertStatus(200)->assertJsonCount(0, 'data');

    Workspace::forgetCurrent();
});
