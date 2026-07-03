<?php

declare(strict_types=1);

use App\Models\SlackIntegration;
use App\Models\Workspace;
use App\Repositories\SlackIntegrationRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('creates then updates the single workspace row (upsert)', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $repo = app(SlackIntegrationRepository::class);

    expect($repo->forWorkspace())->toBeNull();

    $created = $repo->upsert(['webhook_url' => 'https://hooks.slack.com/services/A', 'events' => ['created'], 'is_active' => true]);
    $updated = $repo->upsert(['events' => ['created', 'assigned'], 'is_active' => false]);

    expect(SlackIntegration::query()->count())->toBe(1)
        ->and($updated->id)->toBe($created->id)
        ->and($updated->events)->toBe(['created', 'assigned'])
        ->and($updated->is_active)->toBeFalse()
        ->and($updated->webhook_url)->toBe('https://hooks.slack.com/services/A'); // kept — not in the 2nd upsert

    Workspace::forgetCurrent();
});
