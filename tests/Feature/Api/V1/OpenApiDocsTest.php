<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// filo-incompatible: Scramble re-reads and parses app sources at runtime, and
// under filo's instrumentation (FILO_ENABLED=1) it receives rewritten code that
// php-parser rejects. The traced CI run excludes this group; the untraced run
// still executes these tests.
uses()->group('no-trace');

it('serves a valid OpenAPI 3.1 document at /docs/api.json', function (): void {
    $res = $this->getJson('/docs/api.json');

    $res->assertStatus(200);
    expect($res->json('openapi'))->toStartWith('3.1');
    expect($res->json('paths'))->toBeArray()->not->toBeEmpty();
});

it('serves the docs UI at /docs/api', function (): void {
    $this->get('/docs/api')->assertStatus(200);
});
