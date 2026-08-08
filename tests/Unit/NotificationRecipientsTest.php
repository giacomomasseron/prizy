<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Services\NotificationRecipients;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;
use Tests\TestCase;

// participants() reads real IssueComment rows, so this needs a booted app +
// database (mirrors the Feature-test boot, unlike a pure no-DB Unit test).
uses(TestCase::class);
uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

afterEach(fn () => Workspace::forgetCurrent());

it('participants: returns the assignee and prior commenters, deduped, excluding the actor', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $actor = User::factory()->for($ws, 'workspace')->create();
    $assignee = User::factory()->for($ws, 'workspace')->create();
    $commenter = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create([
        'team_id' => $team->id, 'created_by' => $actor->id, 'assignee_id' => $assignee->id,
    ]);

    // $commenter comments twice - must be deduped to a single entry.
    IssueComment::create(['id' => (string) Str::uuid(), 'issue_id' => $issue->id, 'user_id' => $commenter->id, 'body' => 'first']);
    IssueComment::create(['id' => (string) Str::uuid(), 'issue_id' => $issue->id, 'user_id' => $commenter->id, 'body' => 'second']);
    // The actor also commented - must not appear in their own recipient list.
    IssueComment::create(['id' => (string) Str::uuid(), 'issue_id' => $issue->id, 'user_id' => $actor->id, 'body' => 'from actor']);

    $result = app(NotificationRecipients::class)->participants($issue, $actor->id);
    sort($result);

    $expected = [$assignee->id, $commenter->id];
    sort($expected);

    expect($result)->toBe($expected);
});

it('participants: an unassigned issue with no comments returns an empty list', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $actor = User::factory()->for($ws, 'workspace')->create();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->create(['team_id' => $team->id, 'created_by' => $actor->id]);

    $result = app(NotificationRecipients::class)->participants($issue, $actor->id);

    expect($result)->toBe([]);
});

it('mentioned: matches a full-name mention, case-insensitively', function (): void {
    $members = new Collection([
        member('u-ada', 'Ada Lovelace', 'ada@example.com'),
        member('u-grace', 'Grace Hopper', 'grace@example.com'),
    ]);

    $result = app(NotificationRecipients::class)->mentioned('cc @ADA lovelace please review', $members, 'u-someone-else');

    expect($result)->toBe(['u-ada']);
});

it('mentioned: matches a first-name-only mention', function (): void {
    $members = new Collection([
        member('u-ada', 'Ada Lovelace', 'ada@example.com'),
    ]);

    $result = app(NotificationRecipients::class)->mentioned('hey @Ada, thoughts?', $members, 'u-someone-else');

    expect($result)->toBe(['u-ada']);
});

it('mentioned: matches an email mention', function (): void {
    $members = new Collection([
        member('u-ada', 'Ada Lovelace', 'ada@example.com'),
    ]);

    $result = app(NotificationRecipients::class)->mentioned('ping @ada@example.com', $members, 'u-someone-else');

    expect($result)->toBe(['u-ada']);
});

it('mentioned: excludes a self-mention', function (): void {
    $members = new Collection([
        member('u-ada', 'Ada Lovelace', 'ada@example.com'),
    ]);

    $result = app(NotificationRecipients::class)->mentioned('@Ada Lovelace noting this myself', $members, 'u-ada');

    expect($result)->toBe([]);
});

it('mentioned: dedupes a member mentioned more than once', function (): void {
    $members = new Collection([
        member('u-ada', 'Ada Lovelace', 'ada@example.com'),
    ]);

    $result = app(NotificationRecipients::class)->mentioned('@Ada Lovelace, cc @ada@example.com too', $members, 'u-someone-else');

    expect($result)->toBe(['u-ada']);
});

it('mentioned: a full-name mention is not also attributed to a member whose first name is a prefix of it', function (): void {
    $members = new Collection([
        member('u-john', 'John', 'john@example.com'),
        member('u-john-smith', 'John Smith', 'jsmith@example.com'),
    ]);

    $result = app(NotificationRecipients::class)->mentioned('cc @John Smith', $members, 'u-someone-else');

    expect($result)->toBe(['u-john-smith']);
});

it('mentioned: does not match a member name that appears as a substring inside an unrelated email address', function (): void {
    $members = new Collection([
        member('u-mac', 'Mac', 'mac@builder.io'),
    ]);

    $result = app(NotificationRecipients::class)->mentioned('Ping legal@macfoundation.org about it', $members, 'u-someone-else');

    expect($result)->toBe([]);
});

it('mentioned: a shorter name does not match a longer name that starts with it', function (): void {
    $members = new Collection([
        member('u-mac', 'Mac', 'mac@example.com'),
        member('u-mackenzie', 'Mackenzie', 'mackenzie@example.com'),
    ]);

    $onlyMac = app(NotificationRecipients::class)->mentioned('cc @Mac for review', $members, 'u-someone-else');
    expect($onlyMac)->toBe(['u-mac']);

    $onlyMackenzie = app(NotificationRecipients::class)->mentioned('cc @Mackenzie for review', $members, 'u-someone-else');
    expect($onlyMackenzie)->toBe(['u-mackenzie']);
});

it('mentioned: a real mention at a token boundary still matches', function (): void {
    $members = new Collection([
        member('u-mac', 'Mac', 'mac@example.com'),
    ]);

    $result = app(NotificationRecipients::class)->mentioned('(@Mac) can you take a look?', $members, 'u-someone-else');

    expect($result)->toBe(['u-mac']);
});

it('mentioned: returns an empty list when nobody is mentioned', function (): void {
    $members = new Collection([
        member('u-ada', 'Ada Lovelace', 'ada@example.com'),
    ]);

    $result = app(NotificationRecipients::class)->mentioned('no mentions here', $members, 'u-someone-else');

    expect($result)->toBe([]);
});

/** Build an in-memory (unpersisted) User model for mentioned() fixtures. */
function member(string $id, string $name, string $email): User
{
    $user = new User;
    $user->id = $id;
    $user->name = $name;
    $user->email = $email;

    return $user;
}
