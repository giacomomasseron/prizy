<?php

declare(strict_types=1);

use App\Models\GithubIntegration;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('applies defaults and encrypts the secret at rest', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();

    $secret = 'my-webhook-secret';
    $model = GithubIntegration::create(['id' => Str::uuid()->toString(), 'webhook_token' => Str::random(40), 'webhook_secret' => $secret]);
    $model->refresh();

    expect($model->move_to_done_on_merge)->toBeTrue()
        ->and($model->is_active)->toBeTrue()
        ->and($model->webhook_secret)->toBe($secret);

    $raw = DB::table('github_integrations')->where('id', $model->id)->value('webhook_secret');
    expect($raw)->not->toBe($secret);

    Workspace::forgetCurrent();
});

it('scopes rows to the current workspace (RLS)', function (): void {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    $b->makeCurrent();
    GithubIntegration::factory()->for($b, 'workspace')->create();
    Workspace::forgetCurrent();

    $a->makeCurrent();
    expect(GithubIntegration::query()->count())->toBe(0);
    Workspace::forgetCurrent();
});
