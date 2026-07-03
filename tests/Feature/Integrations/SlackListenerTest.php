<?php

declare(strict_types=1);

use App\Jobs\SendSlackMessage;
use App\Models\SlackIntegration;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Issues\TransitionIssueStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function slackSetup(array $events, bool $active): array
{
    $ws = Workspace::factory()->create(); // factory generates a unique slug (workspaces.slug is UNIQUE)
    $ws->makeCurrent();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create(['admin_level' => 'admin']);
    SlackIntegration::factory()->for($ws, 'workspace')->create(['events' => $events, 'is_active' => $active]);
    $issue = App\Models\Issue::factory()->for($ws, 'workspace')->for($team)->create(['title' => 'Fix login', 'status' => 'todo', 'created_by' => $user->id]);

    return [$ws, $user, $issue];
}

it('dispatches a Slack job with the issue title + deep link on a subscribed, active event', function (): void {
    Queue::fake();
    [$ws, $user, $issue] = slackSetup(['status_changed'], true);

    app(TransitionIssueStatus::class)->handle($user, ['issue_id' => $issue->id, 'status' => 'done']);

    Queue::assertPushed(SendSlackMessage::class, function ($job) use ($ws) {
        $text = (fn () => $this->text)->call($job); // read private prop
        return str_contains($text, 'Fix login') && str_contains($text, $ws->slug . '.') && str_contains($text, '/issues/');
    });

    Workspace::forgetCurrent();
});

it('does not dispatch when inactive, unsubscribed, or unconfigured', function (): void {
    Queue::fake();
    [$ws, $user, $issue] = slackSetup(['status_changed'], false); // inactive
    app(TransitionIssueStatus::class)->handle($user, ['issue_id' => $issue->id, 'status' => 'done']);
    Queue::assertNotPushed(SendSlackMessage::class);
    Workspace::forgetCurrent();

    Queue::fake();
    [$ws2, $user2, $issue2] = slackSetup(['created'], true); // status_changed NOT subscribed
    app(TransitionIssueStatus::class)->handle($user2, ['issue_id' => $issue2->id, 'status' => 'done']);
    Queue::assertNotPushed(SendSlackMessage::class);
    Workspace::forgetCurrent();
});
