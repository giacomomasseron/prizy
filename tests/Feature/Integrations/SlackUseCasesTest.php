<?php

declare(strict_types=1);

use App\Jobs\SendSlackMessage;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Integrations\ConfigureSlackIntegration;
use App\UseCases\Integrations\GetSlackIntegration;
use App\UseCases\Integrations\SendTestSlackMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function slackActor(Workspace $ws): User
{
    return User::factory()->for($ws, 'workspace')->create(['admin_level' => 'admin']);
}

it('configures then reads back the integration, keeping the url when omitted', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $actor = slackActor($ws);

    app(ConfigureSlackIntegration::class)->run($actor, 'https://hooks.slack.com/services/A', ['created'], true);
    $kept = app(ConfigureSlackIntegration::class)->run($actor, null, ['created', 'assigned'], false);

    expect($kept->webhook_url)->toBe('https://hooks.slack.com/services/A')
        ->and($kept->events)->toBe(['created', 'assigned'])
        ->and($kept->is_active)->toBeFalse()
        ->and(app(GetSlackIntegration::class)->run($actor)->id)->toBe($kept->id);

    Workspace::forgetCurrent();
});

it('dispatches a test message when configured', function (): void {
    Queue::fake();
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $actor = slackActor($ws);
    app(ConfigureSlackIntegration::class)->run($actor, 'https://hooks.slack.com/services/A', ['created'], true);

    app(SendTestSlackMessage::class)->run($actor);
    Queue::assertPushed(SendSlackMessage::class);

    Workspace::forgetCurrent();
});

it('rejects a test when no url is configured', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $actor = slackActor($ws);

    expect(fn () => app(SendTestSlackMessage::class)->run($actor))->toThrow(ValidationException::class);

    Workspace::forgetCurrent();
});
