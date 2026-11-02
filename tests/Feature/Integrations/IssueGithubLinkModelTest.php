<?php

declare(strict_types=1);

use App\Models\IssueGithubLink;
use App\Models\Issue;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('applies state/source defaults and casts number to int', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $user = User::factory()->for($ws, 'workspace')->create();
    $issue = Issue::factory()->for($ws, 'workspace')->for($team)->create(['created_by' => $user->id]);

    $link = IssueGithubLink::create([
        'id' => Str::uuid()->toString(),
        'issue_id' => $issue->id,
        'repo' => 'acme/app',
        'number' => 42,
        'url' => 'https://github.com/acme/app/pull/42',
        'created_by' => $user->id,
    ]);
    $link->refresh();

    expect($link->state)->toBe('open')
        ->and($link->source)->toBe('manual')
        ->and($link->number)->toBe(42);

    Workspace::forgetCurrent();
});
