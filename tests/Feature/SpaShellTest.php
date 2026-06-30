<?php

declare(strict_types=1);

use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

it('serves the SPA shell on the workspace host', function (): void {
    $ws = Workspace::factory()->create();
    $this->actingInWorkspace($ws);

    $this->get('/login')->assertStatus(200)->assertSee('id="app"', false);

    Workspace::forgetCurrent();
});
