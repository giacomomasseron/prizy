<?php

declare(strict_types=1);

use App\Models\Issue;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\UseCases\Search\SearchIssues;
use App\UseCases\Search\SearchWorkspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

function actorIn(Workspace $ws): User
{
    return User::factory()->for($ws, 'workspace')->create();
}

it('groups issues, projects and teams for the palette', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $actor = actorIn($ws);
    $team = Team::factory()->for($ws, 'workspace')->create(['name' => 'Payments']);
    Project::factory()->for($ws, 'workspace')->for($team)->create(['name' => 'Payments revamp']);
    Issue::factory()->for($ws, 'workspace')->for($team)->create(['title' => 'Payment webhook', 'created_by' => $actor->id]);

    $groups = app(SearchWorkspace::class)->handle($actor, 'Payment');
    Workspace::forgetCurrent();

    expect($groups['issues'])->toHaveCount(1)
        ->and($groups['projects'])->toHaveCount(1)
        ->and($groups['teams'])->toHaveCount(1);
});

it('returns empty groups for a blank query without touching the engine', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $actor = actorIn($ws);
    // Seed records that a non-blank query ("Payment") WOULD match,
    // proving the early-return guard fires rather than the engine finding nothing.
    $team = Team::factory()->for($ws, 'workspace')->create(['name' => 'Payment team']);
    Project::factory()->for($ws, 'workspace')->for($team)->create(['name' => 'Payment revamp']);
    Issue::factory()->for($ws, 'workspace')->for($team)->create(['title' => 'Payment webhook', 'created_by' => $actor->id]);

    $groups = app(SearchWorkspace::class)->handle($actor, '   ');
    Workspace::forgetCurrent();

    expect($groups['issues'])->toBeEmpty()
        ->and($groups['projects'])->toBeEmpty()
        ->and($groups['teams'])->toBeEmpty();
});

it('paginates issues for the full page', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $actor = actorIn($ws);
    $team = Team::factory()->for($ws, 'workspace')->create();
    foreach (range(1, 3) as $i) {
        Issue::factory()->for($ws, 'workspace')->for($team)->create(['title' => "Payment {$i}", 'created_by' => $actor->id]);
    }

    $page = app(SearchIssues::class)->handle($actor, 'Payment', [], 1);
    Workspace::forgetCurrent();

    expect($page->total())->toBe(3);
});

it('returns an empty paginator for a blank query on the page', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $actor = actorIn($ws);
    // Seed an issue that a non-blank query ("Payment") WOULD match,
    // proving the early-return guard fires rather than the engine finding nothing.
    $team = Team::factory()->for($ws, 'workspace')->create();
    Issue::factory()->for($ws, 'workspace')->for($team)->create(['title' => 'Payment webhook', 'created_by' => $actor->id]);

    $page = app(SearchIssues::class)->handle($actor, '', [], 1);
    Workspace::forgetCurrent();

    expect($page->total())->toBe(0);
});
