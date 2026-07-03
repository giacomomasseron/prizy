<?php

declare(strict_types=1);

use App\Models\Project;
use App\Models\Team;
use App\Models\Workspace;
use App\Repositories\ProjectRepository;
use App\Repositories\TeamRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('finds projects by name within the workspace, case-insensitive', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $team = Team::factory()->for($ws, 'workspace')->create();
    $hit = Project::factory()->for($ws, 'workspace')->for($team)->create(['name' => 'Payments revamp']);
    Project::factory()->for($ws, 'workspace')->for($team)->create(['name' => 'Onboarding']);

    $results = app(ProjectRepository::class)->searchByName('paym', 5);
    Workspace::forgetCurrent();

    expect($results->pluck('id')->all())->toBe([$hit->id]);
});

it('does not leak projects from another workspace', function (): void {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    $b->makeCurrent();
    $tb = Team::factory()->for($b, 'workspace')->create();
    Project::factory()->for($b, 'workspace')->for($tb)->create(['name' => 'Payments B']);
    Workspace::forgetCurrent();

    $a->makeCurrent();
    $results = app(ProjectRepository::class)->searchByName('Payments', 5);
    Workspace::forgetCurrent();

    expect($results)->toBeEmpty();
});

it('finds teams by name or identifier', function (): void {
    $ws = Workspace::factory()->create();
    $ws->makeCurrent();
    $byName = Team::factory()->for($ws, 'workspace')->create(['name' => 'Payments', 'identifier' => 'PAY']);
    $byIdent = Team::factory()->for($ws, 'workspace')->create(['name' => 'Growth', 'identifier' => 'PAYX']);

    $results = app(TeamRepository::class)->searchByName('PAY', 5);
    Workspace::forgetCurrent();

    expect($results->pluck('id')->sort()->values()->all())
        ->toBe(collect([$byName->id, $byIdent->id])->sort()->values()->all());
});
