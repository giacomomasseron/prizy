<?php

declare(strict_types=1);

use App\Models\SlackIntegration;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('applies default events and is_active, and encrypts the webhook url at rest', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();

    $url = 'https://hooks.slack.com/services/T1/B1/secrettoken';
    $model = SlackIntegration::create(['id' => Str::uuid()->toString(), 'webhook_url' => $url]);
    $model->refresh();

    expect($model->events)->toBe(['created', 'status_changed', 'assigned'])
        ->and($model->is_active)->toBeTrue()
        ->and($model->webhook_url)->toBe($url);

    // Encrypted at rest: the raw column is not the plaintext URL.
    $raw = DB::table('slack_integrations')->where('id', $model->id)->value('webhook_url');
    expect($raw)->not->toBe($url);

    Workspace::forgetCurrent();
});

it('scopes rows to the current workspace (RLS)', function (): void {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    $b->makeCurrent();
    SlackIntegration::factory()->for($b, 'workspace')->create();
    Workspace::forgetCurrent();

    $a->makeCurrent();
    expect(SlackIntegration::query()->count())->toBe(0);
    Workspace::forgetCurrent();
});
